import { readFile, writeFile } from "fs/promises"

import { MapFromRecordType } from "@yonagi/common/api/common"
import { Client, ClientType } from "@yonagi/common/clients"
import { Name, NameType } from "@yonagi/common/common"
import {
    CallingStationId,
    CallingStationIdAuthentication,
    CallingStationIdAuthenticationType,
} from "@yonagi/common/mpsks"
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
    private readonly storage: JsonFileBasedStorage<ReadonlyMap<Name, Client>>

    constructor(jsonFilePath: string) {
        super()
        this.storage = new JsonFileBasedStorage(jsonFilePath, MapFromRecordType(NameType, ClientType))
    }

    async all(): Promise<ReadonlyMap<Name, Client>> {
        return await this.storage.load()
    }

    async createOrUpdateByName(name: Name, value: Client): Promise<void> {
        await this.mutate((record) => record.set(name, value))
    }

    async deleteByName(name: Name): Promise<boolean> {
        return await this.mutate((record) => {
            if (record.has(name)) {
                record.delete(name)
                return true
            }
            return false
        })
    }

    async getByName(name: Name): Promise<Client | null> {
        const record = new Map(await this.storage.load())
        return record.get(name) ?? null
    }

    private async mutate<T>(f: (record: Map<Name, Client>) => T): Promise<T> {
        const record = new Map(await this.storage.load())
        const result = f(record)
        await this.storage.save(record)
        return result
    }
}

export class FileBasedMPSKStorage extends AbstractMPSKStorage {
    private readonly storage: JsonFileBasedStorage<CallingStationIdAuthentication[]>

    constructor(jsonFilePath: string) {
        super()
        this.storage = new JsonFileBasedStorage(jsonFilePath, t.array(CallingStationIdAuthenticationType))
    }

    async all(): Promise<readonly CallingStationIdAuthentication[]> {
        return await this.storage.load()
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
