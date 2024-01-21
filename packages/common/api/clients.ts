import * as t from "io-ts/lib/index"

import { ClientType } from "../clients"
import { IpNetworkType, SecretType } from "../common"

export const CreateOrUpdateClientRequestProps = {
    ipaddr: IpNetworkType,
    secret: SecretType,
}

export const CreateClientRequestType = t.type(CreateOrUpdateClientRequestProps)

export const UpdateClientRequestType = t.partial(CreateOrUpdateClientRequestProps)

export const ListClientsResponseType = t.readonlyArray(ClientType)

export type ListClientsResponse = t.TypeOf<typeof ListClientsResponseType>
