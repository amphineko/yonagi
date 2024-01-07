"use server"

import { ListClientsResponseType } from "@yonagi/common/api/clients"
import { Client } from "@yonagi/common/clients"
import { Name } from "@yonagi/common/common"

import { getTypedEndpoint } from "../../lib/actions"

export async function createOrUpdateByName(name: string, client: Client): Promise<void> {
    await fetch(`http://localhost:8000/api/v1/clients/${name}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(client),
    })
}

export async function deleteByName(name: string): Promise<void> {
    await fetch(`http://localhost:8000/api/v1/clients/${name}`, {
        method: "DELETE",
    })
}

export async function getAllClients(): Promise<ReadonlyMap<Name, Client>> {
    return await getTypedEndpoint(ListClientsResponseType, "api/v1/clients")
}
