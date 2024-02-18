import * as t from "io-ts/lib/index"

import { IpNetwork, IpNetworkType } from "./IpNetwork"
import { Name, NameType } from "./Name"
import { Secret, SecretType } from "./Secret"

export interface Client {
    name: Name
    ipaddr: IpNetwork
    secret: Secret
}

interface EncodedClient {
    name: string
    ipaddr: IpNetwork
    secret: string
}

export const ClientType: t.Type<Client, EncodedClient> = t.type({
    name: NameType,
    ipaddr: IpNetworkType,
    secret: SecretType,
})
