"use server"

import {
    CertificateSummaryType,
    CreateCertificateRequest,
    CreateCertificateRequestType,
    GetPkiSummaryResponse,
} from "@yonagi/common/api/pki"
import { SerialNumberString } from "@yonagi/common/pki"

import { deleteEndpoint, getTypedEndpoint, postTypedEndpoint } from "../../lib/actions"

async function createCertificate(form: CreateCertificateRequest, endpoint: string): Promise<void> {
    await postTypedEndpoint(form, endpoint, CreateCertificateRequestType, CertificateSummaryType)
}

export async function createCertificateAuthority(form: CreateCertificateRequest): Promise<void> {
    await createCertificate(form, "api/v1/pki/ca")
}

export async function createServerCertificate(form: CreateCertificateRequest): Promise<void> {
    await createCertificate(form, "api/v1/pki/server")
}

export async function createClientCertificate(form: CreateCertificateRequest): Promise<void> {
    await createCertificate(form, "api/v1/pki/clients")
}

export async function deleteCertificateAuthority(serial: SerialNumberString): Promise<void> {
    await deleteEndpoint(`api/v1/pki/ca/${serial}`)
}

export async function deleteServerCertificate(serial: SerialNumberString): Promise<void> {
    await deleteEndpoint(`api/v1/pki/server/${serial}`)
}

export async function deleteClientCertificate(serial: SerialNumberString): Promise<void> {
    await deleteEndpoint(`api/v1/pki/clients/${serial}`)
}

export async function getPkiSummary(): Promise<GetPkiSummaryResponse> {
    return await getTypedEndpoint(GetPkiSummaryResponse, "api/v1/pki")
}
