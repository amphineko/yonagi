import { readFile, writeFile } from "fs/promises"

import { CallingStationId } from "@yonagi/common/types/CallingStationId"
import { Client, ClientType } from "@yonagi/common/types/Client"
import { CallingStationIdAuthentication, MPSKType } from "@yonagi/common/types/MPSK"
import { Name } from "@yonagi/common/types/Name"
import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as t from "io-ts"
import { PathReporter } from "io-ts/lib/PathReporter"

import { AbstractClientStorage, AbstractMPSKStorage } from "."

class JsonFileBasedStorage<A> {
    constructor(
        private readonly jsonFilePath: string,
        private readonly jsonCodec: t.Decoder<unknown, A> & t.Encoder<A, unknown>,
    ) {}

    public async load(): Promise<A> {
        return F.pipe(
            // read from file
            await readFile(this.jsonFilePath, { encoding: "utf-8" }),
            // parse JSON
            JSON.parse,
            // validate JSON
            (obj) => this.jsonCodec.decode(obj),
            // return the struct or throw error
            E.fold(
                (error) => {
                    throw new Error(PathReporter.report(E.left(error)).join("\n"))
                },
                (x) => x,
            ),
        )
    }

    public async save(obj: A): Promise<void> {
        await writeFile(this.jsonFilePath, JSON.stringify(this.jsonCodec.encode(obj), undefined, 4))
    }
}

export class FileBasedClientStorage extends AbstractClientStorage {
    private readonly storage: JsonFileBasedStorage<readonly Client[]>

    constructor(jsonFilePath: string) {
        super()
        this.storage = new JsonFileBasedStorage(jsonFilePath, t.readonlyArray(ClientType))
    }

    async all(): Promise<readonly Client[]> {
        return await this.storage.load()
    }

    async bulkCreateOrUpdate(values: readonly Client[]): Promise<void> {
        await this.mutate((clients) => {
            for (const value of values) {
                const existing = clients.find((client) => client.name === value.name)
                if (existing) {
                    Object.assign(existing, value)
                } else {
                    clients.push(value)
                }
            }
        })
    }

    async createOrUpdateByName(name: Name, value: Client): Promise<void> {
        await this.mutate((clients) => {
            const existing = clients.find((client) => client.name === name)
            if (existing) {
                Object.assign(existing, value)
            } else {
                clients.push(value)
            }
        })
    }

    async deleteByName(name: Name): Promise<boolean> {
        return await this.mutate((clients) => {
            const idx = clients.findIndex((client) => client.name === name)
            if (idx !== -1) {
                clients.splice(idx, 1)
                return true
            } else {
                return false
            }
        })
    }

    async getByName(name: Name): Promise<Client | null> {
        const clients = await this.all()
        return clients.find((client) => client.name === name) ?? null
    }

    private async mutate<T>(f: (record: Client[]) => T): Promise<T> {
        const clients = Array.from(await this.storage.load())
        const result = f(clients)
        await this.storage.save(clients)
        return result
    }
}

export class FileBasedMPSKStorage extends AbstractMPSKStorage {
    private readonly storage: JsonFileBasedStorage<CallingStationIdAuthentication[]>

    constructor(jsonFilePath: string) {
        super()
        this.storage = new JsonFileBasedStorage(jsonFilePath, t.array(MPSKType))
    }

    async all(): Promise<readonly CallingStationIdAuthentication[]> {
        return await this.storage.load()
    }

    async bulkCreateOrUpdate(values: readonly CallingStationIdAuthentication[]): Promise<void> {
        await this.mutate((record) => {
            for (const mpsk of values) {
                const existing = record.find((x) => x.name === mpsk.name)
                if (existing) {
                    Object.assign(existing, mpsk)
                } else {
                    record.push(mpsk)
                }
            }
        })
    }

    async createOrUpdateByName(name: Name, value: CallingStationIdAuthentication): Promise<void> {
        await this.mutate((record) => {
            for (const mpsk of record) {
                if (mpsk.name === name) {
                    Object.assign(mpsk, value)
                    return
                }
            }

            // create
            record.push(value)
        })
    }

    async deleteByName(name: Name): Promise<boolean> {
        return await this.mutate((record) => {
            for (let i = 0; i < record.length; i++) {
                if (record[i].name === name) {
                    record.splice(i, 1)
                    return true
                }
            }
            return false
        })
    }

    async getByCallingStationId(callingStationId: CallingStationId): Promise<CallingStationIdAuthentication | null> {
        return (await this.all()).find((mpsk) => mpsk.callingStationId === callingStationId) ?? null
    }

    async getByName(name: Name): Promise<CallingStationIdAuthentication | null> {
        return (await this.all()).find((mpsk) => mpsk.name === name) ?? null
    }

    private async mutate<T>(f: (record: CallingStationIdAuthentication[]) => T): Promise<T> {
        const record = await this.storage.load()
        const result = f(record)
        await this.storage.save(record)
        return result
    }
}
