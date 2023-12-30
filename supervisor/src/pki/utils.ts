import { RelativeDistinguishedNames, RelativeDistinguishedNamesType } from "@yonagi/common/pki"
import * as asn1js from "asn1js"
import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as PR from "io-ts/lib/PathReporter"
import * as pkijs from "pkijs"

import { PkiCertificateState } from "./storage"

const id_CommonName = "2.5.4.3"
const id_OrganizationName = "2.5.4.10"

const SUITE_B_192_SIGN_ALG: EcKeyGenParams = {
    name: "ECDSA",
    namedCurve: "P-384",
}
export const SUITE_B_192_HASH_ALG = "SHA-384"

export interface KeyUsages {
    cRLSign: boolean // KeyUsage (6)
    digitalSignature: boolean // KeyUsage (0)
    keyCertSign: boolean // KeyUsage (5)
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

export function createKeyUsageExt(keyUsages: KeyUsages): pkijs.Extension {
    const flags = new Uint8Array([0x00])
    flags[0] |= keyUsages.cRLSign ? 0x02 : 0x00
    flags[0] |= keyUsages.digitalSignature ? 0x80 : 0x00
    flags[0] |= keyUsages.keyCertSign ? 0x04 : 0x00

    const keyUsage = new asn1js.BitString({
        valueHex: flags,
    })
    return new pkijs.Extension({
        extnID: pkijs.id_KeyUsage,
        critical: true,
        extnValue: keyUsage.toBER(false),
        parsedValue: keyUsage,
    })
}

export async function createSuiteBKeyPair(crypto: pkijs.ICryptoEngine): Promise<CryptoKeyPair> {
    return await crypto.generateKey(SUITE_B_192_SIGN_ALG, true, ["sign", "verify"])
}

export function createPkijsRdn(rdn: RelativeDistinguishedNames): pkijs.RelativeDistinguishedNames {
    return new pkijs.RelativeDistinguishedNames({
        typesAndValues: [
            new pkijs.AttributeTypeAndValue({
                type: id_CommonName,
                value: new asn1js.BmpString({ value: rdn.commonName }),
            }),
            new pkijs.AttributeTypeAndValue({
                type: id_OrganizationName,
                value: new asn1js.BmpString({ value: rdn.organizationName }),
            }),
        ],
    })
}

export function parsePkijsRdn(rdn: pkijs.RelativeDistinguishedNames): RelativeDistinguishedNames {
    return F.pipe(
        {
            commonName: rdn.typesAndValues.find((t) => t.type === id_CommonName)?.value.valueBlock.value,
            organizationName: rdn.typesAndValues.find((t) => t.type === id_OrganizationName)?.value.valueBlock.value,
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

export async function importPkiCertificateState(
    state: PkiCertificateState,
    crypto: pkijs.ICryptoEngine,
): Promise<{ cert: pkijs.Certificate; privKey?: CryptoKey }> {
    const cert = new pkijs.Certificate({ schema: asn1js.fromBER(state.cert).result })
    const privKey = state.privKey
        ? await crypto.importKey("pkcs8", state.privKey, SUITE_B_192_SIGN_ALG, true, ["sign", "verify"])
        : undefined
    return { cert, privKey }
}
