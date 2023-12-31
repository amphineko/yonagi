"use server"

import { GetPkiSummaryResponse } from "@yonagi/common/api/pki"

import { getTypedEndpoint } from "../../lib/actions"

export async function getPkiSummary(): Promise<GetPkiSummaryResponse> {
    return await getTypedEndpoint(GetPkiSummaryResponse, "api/v1/pki")
}
