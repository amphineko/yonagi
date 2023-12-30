import * as t from "io-ts"

import { RelativeDistinguishedNamesType } from "../pki"

const nullable = <T extends t.Mixed>(type: T) => t.union([type, t.null])

export const CertificateInfoType = t.type({
    issuer: RelativeDistinguishedNamesType,
    hexSerialNumber: t.string,
    publicKey: t.string,
    signature: t.string,
    subject: RelativeDistinguishedNamesType,
    validNotAfter: t.number,
    validNotBefore: t.number,
})

export type CertificateInfo = t.TypeOf<typeof CertificateInfoType>

export const GetPkiResponse = t.type({
    ca: nullable(CertificateInfoType),
})

export const CreateCertificateAuthorityRequestType = t.type({
    subject: RelativeDistinguishedNamesType,
    validity: t.number,
})
