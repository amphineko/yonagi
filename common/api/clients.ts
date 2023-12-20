import * as t from "io-ts/lib/index"

import { IpNetworkType, Secret } from "../common"

export const CreateOrUpdateClientRequestProps = {
    ipaddr: IpNetworkType,
    secret: Secret,
}

export const CreateClientRequestType = t.type(CreateOrUpdateClientRequestProps)

export const UpdateClientRequestType = t.partial(CreateOrUpdateClientRequestProps)
