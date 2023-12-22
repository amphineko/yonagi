import * as t from "io-ts/lib/index"

import { IpNetworkType, Secret } from "./common"

export const ClientType = t.type({
    ipaddr: IpNetworkType,
    secret: Secret,
})

export type Client = t.TypeOf<typeof ClientType>
