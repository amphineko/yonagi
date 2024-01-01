import * as t from "io-ts"

import { PositiveIntegerFromString } from "../common"
import { RelativeDistinguishedNamesType, SerialNumberStringType } from "../pki"

export const CertificateSummaryType = t.type({
    issuer: RelativeDistinguishedNamesType,
    hexSerialNumber: SerialNumberStringType,
    publicKey: t.string,
    signature: t.string,
    subject: RelativeDistinguishedNamesType,
    validNotAfter: t.number,
    validNotBefore: t.number,
})

export type CertificateSummary = t.TypeOf<typeof CertificateSummaryType>

export const GetPkiSummaryResponse = t.partial({
    ca: CertificateSummaryType,
    server: CertificateSummaryType,
    clients: t.array(CertificateSummaryType),
})

export type GetPkiSummaryResponse = t.TypeOf<typeof GetPkiSummaryResponse>

export const CreateCertificateRequestType = t.type({
    subject: RelativeDistinguishedNamesType,
    validity: PositiveIntegerFromString,
})

export type CreateCertificateRequest = t.TypeOf<typeof CreateCertificateRequestType>
