import { RelativeDistinguishedNames, RelativeDistinguishedNamesType } from "@yonagi/common/pki"
import * as asn1js from "asn1js"
import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as PR from "io-ts/lib/PathReporter"
import * as pkijs from "pkijs"

import {
    OID_CommonName,
    OID_OrganizationName,
    OID_PKCS12_BagId_CertBag,
    OID_PKCS12_BagId_PKCS8ShroudedKeyBag,
    OID_PKCS9_LocalKeyId,
} from "./consts"
import { PkiCertificateState } from "./storage"

export function parsePkijsRdn(rdn: pkijs.RelativeDistinguishedNames): RelativeDistinguishedNames {
    return F.pipe(
        {
            commonName: rdn.typesAndValues.find((t) => t.type === OID_CommonName)?.value.valueBlock.value,
            organizationName: rdn.typesAndValues.find((t) => t.type === OID_OrganizationName)?.value.valueBlock.value,
        },
        (u) => RelativeDistinguishedNamesType.decode(u),
        E.fold(
            (errors) => {
                throw new Error(PR.failure(errors).join("\n"))
            },
            (u) => u,
        ),
    )
}

export function getCertificateSerialAsHexString(cert: pkijs.Certificate): string {
    return formatValueHex(cert.serialNumber.valueBlock.valueHexView)
}

export function formatValueHex(buffer: Uint8Array): string {
    return Array.from(buffer)
        .map((v) => v.toString(16).toLowerCase().padStart(2, "0"))
        .join(":")
}

export async function exportPkiCertificateState(
    crypto: pkijs.ICryptoEngine,
    cert: pkijs.Certificate,
    privKey?: CryptoKey,
): Promise<PkiCertificateState> {
    return {
        cert: cert.toSchema(true).toBER(false),
        privKey: privKey ? await crypto.exportKey("pkcs8", privKey) : undefined,
    }
}

function getEcdsaCurveNameByOid(oid: string): string {
    switch (oid) {
        case "1.3.132.0.34":
            return "P-384"
        case "1.3.132.0.10":
            return "P-256"
        default:
            throw new Error(`Unknown ECDSA curve OID: ${oid}`)
    }
}

async function importPkcs8PrivateKey(pkcs8: ArrayBuffer, crypto: SubtleCrypto): Promise<CryptoKey> {
    const privKey = pkijs.PrivateKeyInfo.fromBER(pkcs8)

    let importParams: EcKeyImportParams | RsaHashedKeyGenParams
    if (privKey.parsedKey instanceof pkijs.ECPrivateKey) {
        const { namedCurve } = privKey.parsedKey
        if (!namedCurve) {
            throw new Error("Cannot import private key without namedCurve")
        }
        importParams = { name: "ECDSA", namedCurve: getEcdsaCurveNameByOid(namedCurve) }
    } else if (privKey.parsedKey instanceof pkijs.RSAPrivateKey) {
        // TODO(amphineko): RSA key import is not tested yet
        // const { modulus, publicExponent } = privKey.parsedKey
        // importParams = {
        //     name: RSA_KEY_ALG_NAME,
        //     hash: RSA_KEY_HASH_NAME,
        //     modulusLength: modulus.valueBlock.valueHex.byteLength << 3,
        //     publicExponent: new Uint8Array(publicExponent.valueBlock.valueHex),
        // }
        throw new Error("RSA key import is not implemented yet")
    } else {
        throw new Error(`Cannot import private key type: ${privKey.className}`)
    }

    return crypto.importKey("pkcs8", pkcs8, importParams, true, ["sign", "verify"])
}

export async function importPkiCertificateState(
    state: PkiCertificateState,
    crypto: pkijs.ICryptoEngine,
): Promise<{ cert: pkijs.Certificate; privKey?: CryptoKey }> {
    const cert = new pkijs.Certificate({ schema: asn1js.fromBER(state.cert).result })
    const privKey = state.privKey ? await importPkcs8PrivateKey(state.privKey, crypto) : undefined
    return { cert, privKey }
}

function getSafeContentEncryptionParams(algorithm: "DES-EDE3-CBC" | "RC2-40-CBC", password: ArrayBuffer) {
    const params = {
        contentEncryptionAlgorithm: {
            name: algorithm,
        } as pkijs.ContentEncryptionAlgorithm,
        hmacHashAlgorithm: "",
        iterationCount: 2048,
        password,
        pbeScheme: "pbes1",
    }
    return params as Omit<typeof params, "pbeScheme">
}

export async function exportClientCertificateP12(
    cert: pkijs.Certificate,
    privKey: CryptoKey,
    trustedCerts: pkijs.Certificate[],
    p12Password: string,
    crypto: pkijs.ICryptoEngine,
): Promise<ArrayBuffer> {
    const password = Buffer.from(p12Password, "utf8")
    const certKeyId = crypto.getRandomValues(new Uint8Array(4))

    /* certificates */

    const certBag = new pkijs.SafeBag({
        bagId: OID_PKCS12_BagId_CertBag,
        bagValue: new pkijs.CertBag({
            parsedValue: cert,
        }),
        bagAttributes: [
            new pkijs.Attribute({
                type: OID_PKCS9_LocalKeyId,
                values: [
                    new asn1js.OctetString({
                        valueHex: certKeyId,
                    }),
                ],
            }),
        ],
    })

    const certSafeContent = new pkijs.SafeContents({
        safeBags: [
            certBag,
            ...trustedCerts.map(
                (cert) =>
                    new pkijs.SafeBag({
                        bagId: OID_PKCS12_BagId_CertBag,
                        bagValue: new pkijs.CertBag({
                            parsedValue: cert,
                        }),
                    }),
            ),
        ],
    })

    /* private key */

    const pkcs8KeyBag = new pkijs.PKCS8ShroudedKeyBag({
        parsedValue: pkijs.PrivateKeyInfo.fromBER(await crypto.exportKey("pkcs8", privKey)),
    })
    await pkcs8KeyBag.makeInternalValues(getSafeContentEncryptionParams("DES-EDE3-CBC", password), crypto)

    const privKeySafeContent = new pkijs.SafeContents({
        safeBags: [
            new pkijs.SafeBag({
                bagId: OID_PKCS12_BagId_PKCS8ShroudedKeyBag,
                bagValue: pkcs8KeyBag,
                bagAttributes: [
                    new pkijs.Attribute({
                        type: OID_PKCS9_LocalKeyId,
                        values: [new asn1js.OctetString({ valueHex: certKeyId })],
                    }),
                ],
            }),
        ],
    })

    /* pfx of cert and private key */

    const authenticatedSafe = new pkijs.AuthenticatedSafe({
        parsedValue: {
            safeContents: [
                {
                    privacyMode: 1, // password-based privacy
                    value: certSafeContent,
                },
                {
                    privacyMode: 0, // no privacy: private key is encrypted
                    value: privKeySafeContent,
                },
            ],
        },
    })
    await authenticatedSafe.makeInternalValues(
        {
            safeContents: [
                // cert: password-based privacy
                getSafeContentEncryptionParams("RC2-40-CBC", password),
                // private key: inner key is encrypted
                {},
            ],
        },
        crypto,
    )

    const pkcs12 = new pkijs.PFX({
        parsedValue: {
            integrityMode: 0,
            authenticatedSafe,
        },
    })

    await pkcs12.makeInternalValues(
        {
            hmacHashAlgorithm: "SHA-1",
            iterations: 1,
            password,
            pbkdf2HashAlgorithm: "SHA-1",
        },
        crypto,
    )

    return pkcs12.toSchema().toBER(false)
}

function formatPemFromBuffer(buffer: Buffer, label: string, comments: string[] = []): string {
    const hex = buffer.toString("base64")
    const lines = hex.match(/.{1,64}/g) ?? []
    return [
        ...comments, // RFC 7468 5.2
        `-----BEGIN ${label}-----`,
        ...lines,
        `-----END ${label}-----`,
    ].join("\r\n")
}

export function exportCertificatePem(cert: pkijs.Certificate): string {
    const subject = parsePkijsRdn(cert.subject)
    const issuer = parsePkijsRdn(cert.issuer)
    const notBefore = new Date(cert.notBefore.value.getTime()).toISOString()
    const notAfter = new Date(cert.notAfter.value.getTime()).toISOString()
    const comments = [
        `Subject: CN=${subject.commonName}, O=${subject.organizationName}`,
        `Issuer: CN=${issuer.commonName}, O=${issuer.organizationName}`,
        `Validity: from ${notBefore} to ${notAfter}`,
    ]

    const certBer = cert.toSchema(true).toBER(false)
    return formatPemFromBuffer(Buffer.from(certBer), "CERTIFICATE", comments)
}

export async function exportPrivateKeyPem(privKey: CryptoKey, crypto: pkijs.ICryptoEngine): Promise<string> {
    const comments = [`Algorithm: ${privKey.algorithm.name}`]
    const pkcs8 = await crypto.exportKey("pkcs8", privKey)
    return formatPemFromBuffer(Buffer.from(pkcs8), "PRIVATE KEY", comments)
}
