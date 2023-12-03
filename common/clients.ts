import * as t from "io-ts/lib/index"

import { FileBasedStorage } from "./storage"

export interface Client extends t.TypeOf<typeof JsonClient> {}

const JsonClient = t.type({
    name: t.string,
    ipaddr: t.string,
    secret: t.string,
})

const JsonClientStorage = t.record(t.string, JsonClient)

export class ClientStorage extends FileBasedStorage<Record<string, Client>> {
    async list(): Promise<Client[]> {
        return Object.values(await this.load())
    }

    constructor(jsonFilePath: string) {
        super(jsonFilePath, JsonClientStorage)
    }
}
