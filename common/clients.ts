import * as t from "io-ts/lib/index"

import { IpNetworkType, SecretType } from "./common"

export const ClientType = t.type({
    ipaddr: IpNetworkType,
    secret: SecretType,
})

export type Client = t.TypeOf<typeof ClientType>
