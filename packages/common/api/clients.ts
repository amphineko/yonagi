import * as t from "io-ts/lib/index"

import { ClientType } from "../types/Client"
import { IpNetworkType } from "../types/IpNetwork"
import { SecretType } from "../types/Secret"

export const CreateOrUpdateClientRequestProps = {
    ipaddr: IpNetworkType,
    secret: SecretType,
}

export const CreateClientRequestType = t.type(CreateOrUpdateClientRequestProps)

export const UpdateClientRequestType = t.partial(CreateOrUpdateClientRequestProps)

export const ListClientsResponseType = t.readonlyArray(ClientType)

export type ListClientsResponse = t.TypeOf<typeof ListClientsResponseType>

export const BulkCreateOrUpdateClientsRequestType = t.readonlyArray(ClientType)

export type BulkCreateOrUpdateClientsRequest = t.TypeOf<typeof BulkCreateOrUpdateClientsRequestType>
