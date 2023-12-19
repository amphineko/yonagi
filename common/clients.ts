import * as t from "io-ts/lib/index"

import { IpNetworkType, Secret } from "./common"
import { FileBasedKVStorage } from "./storage"

const ClientType = t.type({
    ipaddr: IpNetworkType,
    secret: Secret,
})

export type Client = t.TypeOf<typeof ClientType>

export class ClientStorage extends FileBasedKVStorage<Client> {
    constructor(jsonFilePath: string) {
        super(jsonFilePath, ClientType)
    }
}
