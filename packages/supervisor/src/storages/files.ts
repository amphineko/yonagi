import { readFile, writeFile } from "fs/promises"

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

export class FileBasedKVStorage<T> {
    private readonly codec: t.Decoder<unknown, Record<Name, T>> & t.Encoder<Record<Name, T>, unknown>

    constructor(
        private jsonFilePath: string,
        valueCodec: t.Type<T>,
    ) {
        this.codec = t.record(NameType, valueCodec)
    }

    async all(): Promise<ReadonlyMap<Name, T>> {
        return await this.load()
    }

    async delete(key: Name): Promise<boolean> {
        const kv = await this.load()
        const deleted = kv.delete(key)
        await this.save(kv)
        return deleted
    }

    async get(key: Name): Promise<T | null> {
        const kv = await this.load()
        return kv.get(key) ?? null
    }

    async set(key: Name, value: T): Promise<void> {
        const kv = await this.load()
        kv.set(key, value)
        await this.save(kv)
    }

    private async load(): Promise<Map<Name, T>> {
        return F.pipe(
            // read from file
            await readFile(this.jsonFilePath, { encoding: "utf-8" }),
            // parse JSON
            JSON.parse,
            // validate JSON
            (obj) => this.codec.decode(obj),
            // return the struct or throw error
            E.fold(
                (error) => {
                    throw new Error(PathReporter.report(E.left(error)).join("\n"))
                },
                (x) => x,
            ),
            (record) => new Map(Object.entries(record)),
        )
    }

    private async save(kv: Map<Name, T>): Promise<void> {
        await writeFile(
            this.jsonFilePath,
            JSON.stringify(
                kv,
                // convert Map to serializable Record
                <T, K extends keyof object, V, R = T extends Map<K, V> ? Record<K, V> : T>(_: unknown, v: T): T | R => {
                    return v instanceof Map ? (Object.fromEntries(v.entries()) as R) : v
                },
                4,
            ),
        )
    }
}

export class FileBasedClientStorage extends AbstractClientStorage {
    private readonly storage: FileBasedKVStorage<Client>

    constructor(jsonFilePath: string) {
        super()
        this.storage = new FileBasedKVStorage(jsonFilePath, ClientType)
    }

    async all(): Promise<ReadonlyMap<Name, Client>> {
        return await this.storage.all()
    }

    async createOrUpdateByName(name: Name, value: Client): Promise<void> {
        await this.storage.set(name, value)
    }

    async deleteByName(name: Name): Promise<boolean> {
        return await this.storage.delete(name)
    }

    async getByName(name: Name): Promise<Client | null> {
        return await this.storage.get(name)
    }
}

export class FileBasedMPSKStorage extends AbstractMPSKStorage {
    private readonly storage: FileBasedKVStorage<CallingStationIdAuthentication>

    constructor(jsonFilePath: string) {
        super()
        this.storage = new FileBasedKVStorage(jsonFilePath, CallingStationIdAuthenticationType)
    }

    async all(): Promise<ReadonlyMap<Name, CallingStationIdAuthentication>> {
        return await this.storage.all()
    }

    async createOrUpdateByName(name: Name, value: CallingStationIdAuthentication): Promise<void> {
        await this.storage.set(name, value)
    }

    async deleteByName(name: Name): Promise<void> {
        await this.storage.delete(name)
    }

    async getByCallingStationId(callingStationId: CallingStationId): Promise<CallingStationIdAuthentication | null> {
        const all = await this.all()
        for (const mpsk of all.values()) {
            if (mpsk.callingStationId === callingStationId) {
                return mpsk
            }
        }
        return null
    }

    async getByName(name: Name): Promise<CallingStationIdAuthentication | null> {
        return await this.storage.get(name)
    }
}
