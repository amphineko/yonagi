"use server"

import { ListMPSKsResponseType } from "@yonagi/common/api/mpsks"
import { Name } from "@yonagi/common/common"
import { CallingStationIdAuthentication } from "@yonagi/common/mpsks"

import { getAll } from "../../lib/actions"

export async function createOrUpdateByName(name: string, mpsk: CallingStationIdAuthentication): Promise<void> {
    await fetch(`http://localhost:8000/api/v1/mpsks/${name}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(mpsk),
    })
}

export async function deleteByName(name: string): Promise<void> {
    await fetch(`http://localhost:8000/api/v1/mpsks/${name}`, {
        method: "DELETE",
    })
}

export async function getAllMpsks(): Promise<ReadonlyMap<Name, CallingStationIdAuthentication>> {
    return await getAll("api/v1/mpsks", ListMPSKsResponseType)
}
