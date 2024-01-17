"use server"

import { ListMPSKsResponseType } from "@yonagi/common/api/mpsks"
import { CallingStationIdAuthentication, CallingStationIdAuthenticationType } from "@yonagi/common/mpsks"
import * as t from "io-ts"

import { deleteEndpoint, getTypedEndpoint, postTypedEndpoint } from "../../lib/actions"

export async function createOrUpdateByName(name: string, mpsk: CallingStationIdAuthentication): Promise<void> {
    await postTypedEndpoint(t.any, CallingStationIdAuthenticationType, `api/v1/mpsks/${name}`, mpsk)
}

export async function deleteByName(name: string): Promise<void> {
    await deleteEndpoint(`api/v1/mpsks/${name}`)
}

export async function getAllMpsks(): Promise<readonly CallingStationIdAuthentication[]> {
    return await getTypedEndpoint(ListMPSKsResponseType, "api/v1/mpsks")
}
