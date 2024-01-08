"use server"

import * as t from "io-ts"

import { postTypedEndpoint } from "../lib/actions"

export async function reload(): Promise<void> {
    await postTypedEndpoint(t.any, t.any, "api/v1/radiusd/reload", undefined)
}
