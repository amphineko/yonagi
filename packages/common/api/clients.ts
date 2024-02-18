import * as t from "io-ts/lib/index"

import { Client } from "../types/Client"
import { IpNetworkFromStringType } from "../types/IpNetworkFromString"
import { NameType } from "../types/Name"
import { SecretType } from "../types/Secret"

interface JsonClient {
    name: string
    ipaddr: string
    secret: string
}

export const JsonClientType: t.Type<Client, JsonClient> = t.type({
    name: NameType,
    ipaddr: IpNetworkFromStringType,
    secret: SecretType,
})

export const CreateOrUpdateClientRequestType = JsonClientType

export const ListClientsResponseType = t.readonlyArray(JsonClientType)

export type ListClientsResponse = t.TypeOf<typeof ListClientsResponseType>

export const BulkCreateOrUpdateClientsRequestType = t.readonlyArray(JsonClientType)

export type BulkCreateOrUpdateClientsRequest = t.TypeOf<typeof BulkCreateOrUpdateClientsRequestType>
