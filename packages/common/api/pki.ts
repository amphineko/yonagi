import * as t from "io-ts"

import {
    CertificateMetadata,
    CertificateMetadataType,
    EncodedCertificateMetadata,
} from "../types/pki/CertificateMetadata"
import { RelativeDistinguishedNames, RelativeDistinguishedNamesType } from "../types/pki/RelativeDistinguishedNames"

/**
 * Extended metadata for user interface
 */
export interface CertificateSummary extends CertificateMetadata {
    issuer: RelativeDistinguishedNames
    publicKey: string
    signature: string
}

interface EncodedCertificateSummary extends EncodedCertificateMetadata {
    issuer: RelativeDistinguishedNames
    publicKey: string
    signature: string
}

export const CertificateSummaryType: t.Type<CertificateSummary, EncodedCertificateSummary> = t.intersection([
    CertificateMetadataType,
    t.type({
        issuer: RelativeDistinguishedNamesType,
        publicKey: t.string,
        signature: t.string,
    }),
])

export const GetPkiSummaryResponse = t.partial({
    ca: CertificateSummaryType,
    server: CertificateSummaryType,
    clients: t.array(CertificateSummaryType),
})

export type GetPkiSummaryResponse = t.TypeOf<typeof GetPkiSummaryResponse>

export const CreateCertificateRequestType = t.type({
    subject: RelativeDistinguishedNamesType,
    validity: t.number,
})

export type CreateCertificateRequest = t.TypeOf<typeof CreateCertificateRequestType>

export const ExportClientCertificateP12RequestType = t.type({
    password: t.string,
})
