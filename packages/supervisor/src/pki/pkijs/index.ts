import { Inject, Injectable } from "@nestjs/common"
import { CertificateMetadata } from "@yonagi/common/types/pki/CertificateMetadata"
import {
    RelativeDistinguishedNames,
    RelativeDistinguishedNamesType,
} from "@yonagi/common/types/pki/RelativeDistinguishedNames"
import { getOrThrow } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import * as pkijs from "pkijs"

import { CryptoEngineShim } from "./cryptoEngine"
import { exportAsPkcs12 } from "./pkcs12"
import { createCertificate } from "./utils"
import { Certificate, CertificateFactory, CreateCertificateProps } from ".."
import { OID_CommonName, OID_OrganizationName } from "../consts"

export class PkijsCertificate implements Certificate {
    public readonly metadata: CertificateMetadata

    async exportAsPkcs12(password: string, addCerts?: readonly Certificate[]): Promise<ArrayBuffer> {
        return await F.pipe(
            E.Do,
            E.bind("privateKey", () =>
                E.fromNullable(new Error("Cannot export PKCS#12 of certificate without private key"))(this.privateKey),
            ),
            E.bind("addCerts", () =>
                F.pipe(
                    addCerts ?? [],
                    E.fromPredicate(
                        (cs): cs is readonly PkijsCertificate[] => cs.every((c) => c instanceof PkijsCertificate),
                        () => new Error("Cannot export PKCS#12 of certificate with invalid addCerts"),
                    ),
                    E.map((cs) => cs.map((c) => c.pkijsCertificate)),
                ),
            ),
            TE.fromEither,
            TE.flatMap(({ addCerts, privateKey }) =>
                TE.tryCatch(
                    () => exportAsPkcs12(this.cert, privateKey, addCerts, password, this.crypto as pkijs.ICryptoEngine),
                    (e) => e as Error,
                ),
            ),
            getOrThrow(),
        )()
    }

    exportCertificateAsBer(): Promise<ArrayBuffer> {
        return Promise.resolve(this.cert.toSchema(true).toBER(false))
    }

    async exportCertificateAsPem(): Promise<string> {
        const subject = parsePkijsRdn(this.cert.subject)
        const issuer = parsePkijsRdn(this.cert.issuer)

        const notBefore = new Date(this.cert.notBefore.value.getTime()).toISOString()
        const notAfter = new Date(this.cert.notAfter.value.getTime()).toISOString()

        const comments = [
            `Subject: CN=${subject.commonName}, O=${subject.organizationName}`,
            `Issuer: CN=${issuer.commonName}, O=${issuer.organizationName}`,
            `Validity: from ${notBefore} to ${notAfter}`,
        ]

        const certBer = await this.exportCertificateAsBer()
        return Promise.resolve(formatPemFromBuffer(Buffer.from(certBer), "CERTIFICATE", comments))
    }

    async exportPrivateKeyPkcs8AsBer(): Promise<ArrayBuffer | undefined> {
        if (!this.privateKey) {
            return undefined
        }

        return await this.crypto.exportKey("pkcs8", this.privateKey)
    }

    async exportPrivateKeyPkcs8AsPem(): Promise<string | undefined> {
        const pkcs8 = await this.exportPrivateKeyPkcs8AsBer()
        if (!pkcs8) {
            return undefined
        }

        const comments = [`Algorithm: ${this.privateKey?.algorithm.name}`]
        return formatPemFromBuffer(Buffer.from(pkcs8), "PRIVATE KEY", comments)
    }

    /**
     * @internal
     */
    constructor(
        private readonly crypto: CryptoEngineShim,
        private readonly cert: pkijs.Certificate,
        public readonly privateKey?: CryptoKey,
    ) {
        this.cert = cert
        this.privateKey = privateKey
        this.metadata = {
            serialNumber: Buffer.from(cert.serialNumber.valueBlock.valueHexView).toString("hex").toLowerCase(),
            notBefore: cert.notBefore.value,
            notAfter: cert.notAfter.value,
            subject: parsePkijsRdn(cert.subject),
        }
    }

    /**
     * @internal
     */
    get pkijsCertificate(): pkijs.Certificate {
        return this.cert
    }
}

@Injectable()
export class PkijsCertificateFactory extends CertificateFactory {
    constructor(@Inject(CryptoEngineShim) private readonly crypto: CryptoEngineShim) {
        super()
    }

    async createCertificate(props: CreateCertificateProps): Promise<Certificate> {
        const { cert, privateKey } = await createCertificate(props, this.crypto)
        return new PkijsCertificate(this.crypto, cert, privateKey)
    }

    async importCertificateFromPem(certBer: ArrayBuffer, privateKeyPkcs8Ber?: ArrayBuffer): Promise<Certificate> {
        return new PkijsCertificate(
            this.crypto,
            pkijs.Certificate.fromBER(certBer),
            privateKeyPkcs8Ber ? await importPkcs8PrivateKey(privateKeyPkcs8Ber, this.crypto) : undefined,
        )
    }
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

async function importPkcs8PrivateKey(pkcs8: ArrayBuffer, crypto: CryptoEngineShim): Promise<CryptoKey> {
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
        throw new Error("RSA key import is not implemented")
    } else {
        throw new Error(`Cannot import private key type: ${privKey.className}`)
    }

    return crypto.importKey("pkcs8", pkcs8, importParams, true, ["sign", "verify"])
}

function parsePkijsRdn(rdn: pkijs.RelativeDistinguishedNames): RelativeDistinguishedNames {
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
