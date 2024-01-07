"use server"

import { GetRecentLogsResponse, GetRecentLogsResponseType } from "@yonagi/common/api/radiusd"

import { getTypedEndpoint } from "../../lib/actions"

export async function getRecentLogs(): Promise<GetRecentLogsResponse> {
    return await getTypedEndpoint(GetRecentLogsResponseType, "api/v1/radiusd/log")
}
