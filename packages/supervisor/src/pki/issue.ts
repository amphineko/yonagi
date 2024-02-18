import { RelativeDistinguishedNames } from "@yonagi/common/types/pki/RelativeDistinguishedNames"
import * as asn1js from "asn1js"
import * as pkijs from "pkijs"

import { OID_ClientAuth, OID_CommonName, OID_KP_EapOverLan, OID_OrganizationName, OID_ServerAuth } from "./consts"

export interface CreateCertificateIssuer {
    cert: pkijs.Certificate
    privKey: CryptoKey
}

type CreateCertificateProps = {
    crypto: pkijs.ICryptoEngine
    extendedKeyUsages?: ExtendedKeyUsages
    hashAlg: string
    isCa?: boolean
    keyParams: EcKeyGenParams | RsaHashedKeyGenParams
    subject: RelativeDistinguishedNames
    keyUsages: KeyUsages
    validityDays: number
} & (
    | {
          issuer?: never
          selfSigned: true
      }
    | {
          issuer: CreateCertificateIssuer
          selfSigned?: never
      }
)

interface CreateCertificateResult {
    cert: pkijs.Certificate
    privKey: CryptoKey
}

export interface KeyUsages {
    digitalSignature?: boolean // KeyUsage (0)
    contentCommitment?: boolean // KeyUsage (1)
    keyEncipherment?: boolean // KeyUsage (2)
    keyCertSign?: boolean // KeyUsage (5)
    cRLSign?: boolean // KeyUsage (6)
}

export interface ExtendedKeyUsages {
    serverAuth?: boolean // OID_ServerAuth
    clientAuth?: boolean // OID_ClientAuth
    eapOverLan?: boolean // OID_KP_EapOverLan
}

export function createBasicConstraintsExt(params: pkijs.BasicConstraintsParameters): pkijs.Extension {
    const constraints = new pkijs.BasicConstraints(params)
    return new pkijs.Extension({
        extnID: pkijs.id_BasicConstraints,
        critical: true,
        extnValue: constraints.toSchema().toBER(false),
        parsedValue: constraints,
    })
}

export function createExtendedKeyUsageExt(extendedKeyUsages: ExtendedKeyUsages): pkijs.Extension {
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

export function createKeyUsageBitString(keyUsages: KeyUsages): asn1js.BitString {
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

export function createKeyUsageExt(keyUsages: KeyUsages): pkijs.Extension {
    const keyUsage = createKeyUsageBitString(keyUsages)
    return new pkijs.Extension({
        extnID: pkijs.id_KeyUsage,
        critical: true,
        extnValue: keyUsage.toBER(false),
        parsedValue: keyUsage,
    })
}

export function createPkijsRdn(rdn: RelativeDistinguishedNames): pkijs.RelativeDistinguishedNames {
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

export async function createCertificate({
    crypto,
    extendedKeyUsages,
    hashAlg,
    isCa,
    issuer,
    keyUsages: subjectKeyUsages,
    keyParams,
    selfSigned,
    subject,
    validityDays,
}: CreateCertificateProps): Promise<CreateCertificateResult> {
    const now = new Date()
    const serialNumber = crypto.getRandomValues(new Uint8Array(16))

    const cert = new pkijs.Certificate()
    cert.extensions = [createBasicConstraintsExt({ cA: isCa ?? false }), createKeyUsageExt(subjectKeyUsages)]
    if (extendedKeyUsages) cert.extensions.push(createExtendedKeyUsageExt(extendedKeyUsages))
    cert.notAfter.value = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000)
    cert.notBefore.value = now
    cert.serialNumber = new asn1js.Integer({ valueHex: serialNumber })
    cert.subject = createPkijsRdn(subject)
    cert.version = 0x02

    const { privateKey, publicKey } = await crypto.generateKey(keyParams, true, ["sign", "verify"])
    await cert.subjectPublicKeyInfo.importKey(publicKey, crypto)

    if (selfSigned) {
        cert.issuer = cert.subject
        await cert.sign(privateKey, hashAlg, crypto)
    } else {
        cert.issuer = issuer.cert.subject
        await cert.sign(issuer.privKey, hashAlg, crypto)
    }

    return { cert, privKey: privateKey }
}
