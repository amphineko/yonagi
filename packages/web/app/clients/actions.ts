"use server"

import { BulkCreateOrUpdateClientsRequestType, ListClientsResponseType } from "@yonagi/common/api/clients"
import { Client, ClientType } from "@yonagi/common/types/Client"
import * as t from "io-ts"

import { deleteEndpoint, getTypedEndpoint, postTypedEndpoint } from "../../lib/actions"

export async function bulkCreateOrUpdate(clients: readonly Client[]): Promise<void> {
    await postTypedEndpoint(t.any, BulkCreateOrUpdateClientsRequestType, "api/v1/clients", clients)
}

export async function createOrUpdateByName(name: string, client: Client): Promise<void> {
    await postTypedEndpoint(t.any, ClientType, `api/v1/clients/${name}`, client)
}

export async function deleteByName(name: string): Promise<void> {
    await deleteEndpoint(`api/v1/clients/${name}`)
}

export async function getAllClients(): Promise<readonly Client[]> {
    return await getTypedEndpoint(ListClientsResponseType, "api/v1/clients")
}
