"use server"

import { GetStatusResponse, GetStatusResponseType } from "@yonagi/common/api/radiusd"
import * as t from "io-ts"

import { getTypedEndpoint, postTypedEndpoint } from "../lib/actions"

export async function getStatus(): Promise<GetStatusResponse> {
    return await getTypedEndpoint(GetStatusResponseType, "api/v1/radiusd/status")
}

export async function reloadRadiusd(): Promise<void> {
    await postTypedEndpoint(t.any, t.any, "api/v1/radiusd/reload", null)
}

export async function restartRadiusd(): Promise<void> {
    await postTypedEndpoint(t.any, t.any, "api/v1/radiusd/restart", null)
}
