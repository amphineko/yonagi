import * as t from "io-ts/lib/index"

import { IpNetworkType, NameType, SecretType } from "./common"

export const ClientType = t.type({
    name: NameType,
    ipaddr: IpNetworkType,
    secret: SecretType,
})

export type Client = t.TypeOf<typeof ClientType>
