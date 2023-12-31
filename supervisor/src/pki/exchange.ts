import { RelativeDistinguishedNames, RelativeDistinguishedNamesType } from "@yonagi/common/pki"
import * as asn1js from "asn1js"
import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as PR from "io-ts/lib/PathReporter"
import * as pkijs from "pkijs"

import { OID_CommonName, OID_OrganizationName, SUITE_B_192_SIGN_ALG } from "./consts"
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
