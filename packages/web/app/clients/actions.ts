"use server"

import {
    BulkCreateOrUpdateClientsRequestType,
    CreateOrUpdateClientRequestType,
    ListClientsResponseType,
} from "@yonagi/common/api/clients"
import { Client } from "@yonagi/common/types/Client"
import * as t from "io-ts"

import { deleteEndpoint, getTypedEndpoint, postTypedEndpoint } from "../../lib/actions"

export async function bulkCreateOrUpdateClient(clients: readonly Client[]): Promise<void> {
    await postTypedEndpoint(t.any, BulkCreateOrUpdateClientsRequestType, "api/v1/clients", clients)
}

export async function createOrUpdateClientByName(name: string, client: Client): Promise<void> {
    await postTypedEndpoint(t.any, CreateOrUpdateClientRequestType, `api/v1/clients/${name}`, client)
}

export async function deleteClientByName(name: string): Promise<void> {
    await deleteEndpoint(`api/v1/clients/${name}`)
}

export async function listClients(): Promise<readonly Client[]> {
    return await getTypedEndpoint(ListClientsResponseType, "api/v1/clients")
}
