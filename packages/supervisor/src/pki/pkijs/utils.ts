import { RelativeDistinguishedNames } from "@yonagi/common/types/pki/RelativeDistinguishedNames"
import * as asn1js from "asn1js"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as pkijs from "pkijs"

import { PkijsCertificate } from "."
import { CryptoEngineShim } from "./cryptoEngine"
import { CreateCertificateProps, ExtendedKeyUsages, KeyUsages } from ".."
import { OID_ClientAuth, OID_CommonName, OID_KP_EapOverLan, OID_OrganizationName, OID_ServerAuth } from "../consts"

interface CreateCertificateResult {
    cert: pkijs.Certificate
    privateKey: CryptoKey
}

function createBasicConstraintsExt(params: pkijs.BasicConstraintsParameters): pkijs.Extension {
    const constraints = new pkijs.BasicConstraints(params)
    return new pkijs.Extension({
        extnID: pkijs.id_BasicConstraints,
        critical: true,
        extnValue: constraints.toSchema().toBER(false),
        parsedValue: constraints,
    })
}

function createExtendedKeyUsageExt(extendedKeyUsages: ExtendedKeyUsages): pkijs.Extension {
    const keyUsages: string[] = []
    if (extendedKeyUsages.serverAuth) keyUsages.push(OID_ServerAuth)
    if (extendedKeyUsages.clientAuth) keyUsages.push(OID_ClientAuth)
    if (extendedKeyUsages.eapOverLan) keyUsages.push(OID_KP_EapOverLan)

    const extKeyUsage = new pkijs.ExtKeyUsage({
        keyPurposes: keyUsages,
    })
    return new pkijs.Extension({
        extnID: pkijs.id_ExtKeyUsage,
        critical: true,
        extnValue: extKeyUsage.toSchema().toBER(false),
        parsedValue: extKeyUsage,
    })
}

function createKeyUsageBitString(keyUsages: KeyUsages): asn1js.BitString {
    const flags = new Uint8Array([0x00])
    flags[0] |= keyUsages.digitalSignature ? 0x80 : 0x00
    flags[0] |= keyUsages.contentCommitment ? 0x40 : 0x00
    flags[0] |= keyUsages.keyEncipherment ? 0x20 : 0x00
    flags[0] |= keyUsages.keyCertSign ? 0x04 : 0x00
    flags[0] |= keyUsages.cRLSign ? 0x02 : 0x00

    return new asn1js.BitString({
        valueHex: flags,
    })
}

function createKeyUsageExt(keyUsages: KeyUsages): pkijs.Extension {
    const keyUsage = createKeyUsageBitString(keyUsages)
    return new pkijs.Extension({
        extnID: pkijs.id_KeyUsage,
        critical: true,
        extnValue: keyUsage.toBER(false),
        parsedValue: keyUsage,
    })
}

function convertRdnToPkijsRdn(rdn: RelativeDistinguishedNames): pkijs.RelativeDistinguishedNames {
    return new pkijs.RelativeDistinguishedNames({
        typesAndValues: [
            new pkijs.AttributeTypeAndValue({
                type: OID_CommonName,
                value: new asn1js.BmpString({ value: rdn.commonName }),
            }),
            new pkijs.AttributeTypeAndValue({
                type: OID_OrganizationName,
                value: new asn1js.BmpString({ value: rdn.organizationName }),
            }),
        ],
    })
}

export function convertPkijsRdnToRdn(rdn: pkijs.RelativeDistinguishedNames): RelativeDistinguishedNames {
    return F.pipe(
        E.Do,
        E.bind("commonName", () =>
            E.fromNullable(new Error("Common Name is not defined"))(
                rdn.typesAndValues.find((t) => t.type === OID_CommonName)?.value.valueBlock.value,
            ),
        ),
        E.bind("organizationName", () =>
            E.fromNullable(new Error("Organization Name is not defined"))(
                rdn.typesAndValues.find((t) => t.type === OID_OrganizationName)?.value.valueBlock.value,
            ),
        ),
        E.getOrElseW(() => {
            throw new Error("Cannot convert RDN to PKI.js RDN")
        }),
    )
}

export async function createCertificate(
    {
        extendedKeyUsages,
        hashingAlgorithm,
        issuer,
        keyUsages,
        notAfter,
        notBefore,
        privateKeyParams,
        subject,
    }: CreateCertificateProps,
    crypto: CryptoEngineShim,
): Promise<CreateCertificateResult> {
    const cert = new pkijs.Certificate()
    cert.version = 0x02

    cert.extensions = [createBasicConstraintsExt({ cA: issuer === null }), createKeyUsageExt(keyUsages)]
    if (extendedKeyUsages) {
        cert.extensions.push(createExtendedKeyUsageExt(extendedKeyUsages))
    }

    cert.notAfter.value = notAfter
    cert.notBefore.value = notBefore

    cert.serialNumber = new asn1js.Integer({
        valueHex: crypto.getRandomValues(new Uint8Array(16)),
    })

    cert.subject = convertRdnToPkijsRdn(subject)
    if (issuer) {
        if (!(issuer instanceof PkijsCertificate)) {
            throw new Error("Cannot derive issuer's subject from non-Pkijs certificate factory")
        }
        cert.issuer = issuer.pkijsCertificate.subject
    } else {
        cert.issuer = cert.subject
    }

    const { privateKey, publicKey } = await crypto.generateKey(privateKeyParams, true, ["sign", "verify"])
    await cert.subjectPublicKeyInfo.importKey(publicKey, crypto as pkijs.ICryptoEngine)

    if (issuer) {
        if (!issuer.privateKey) {
            throw new Error("Certificate issuer does not have a private key")
        }
        await cert.sign(issuer.privateKey, hashingAlgorithm, crypto as pkijs.ICryptoEngine)
    } else {
        await cert.sign(privateKey, hashingAlgorithm, crypto as pkijs.ICryptoEngine)
    }

    return { cert, privateKey }
}

export function getSerialNumberFromCertificate(cert: pkijs.Certificate): string {
    return Buffer.from(cert.serialNumber.valueBlock.valueHexView).toString("hex").toLowerCase()
}
