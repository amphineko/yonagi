import * as t from "io-ts"

import { RelativeDistinguishedNames, RelativeDistinguishedNamesType } from "./RelativeDistinguishedNames"
import { SerialNumberString, SerialNumberStringType } from "./SerialNumberString"
import { DateFromUnixTimestamp } from "../Date"

/**
 * Metadata extracted from a certificate
 * For storage lookup without needing to parse the entire certificate.
 */
export interface CertificateMetadata {
    readonly subject: RelativeDistinguishedNames
    readonly serialNumber: SerialNumberString

    readonly notBefore: Date
    readonly notAfter: Date
}

export interface EncodedCertificateMetadata {
    subject: RelativeDistinguishedNames
    serialNumber: string

    notBefore: number
    notAfter: number
}

export const CertificateMetadataType: t.Type<CertificateMetadata, EncodedCertificateMetadata> = t.type({
    subject: RelativeDistinguishedNamesType,
    serialNumber: SerialNumberStringType,

    notBefore: DateFromUnixTimestamp,
    notAfter: DateFromUnixTimestamp,
})
