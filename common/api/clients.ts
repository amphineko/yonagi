import * as t from "io-ts/lib/index"

import { MapFromRecordType } from "./common"
import { ClientType } from "../clients"
import { IpNetworkType, NameType, Secret } from "../common"

export const CreateOrUpdateClientRequestProps = {
    ipaddr: IpNetworkType,
    secret: Secret,
}

export const CreateClientRequestType = t.type(CreateOrUpdateClientRequestProps)

export const UpdateClientRequestType = t.partial(CreateOrUpdateClientRequestProps)

export const ListClientsResponseType = MapFromRecordType(NameType, ClientType)

export type ListClientsResponse = t.TypeOf<typeof ListClientsResponseType>
