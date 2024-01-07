import { readFile, writeFile } from "fs/promises"

import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as t from "io-ts"
import { PathReporter } from "io-ts/lib/PathReporter"

import { Client, ClientType } from "./clients"
import { Name, NameType } from "./common"
import { CallingStationIdAuthentication, CallingStationIdAuthenticationType } from "./mpsks"

export interface KVStorage<K extends string, V> {
    all(): Promise<ReadonlyMap<K, V>>
    delete(key: K): Promise<boolean>
    get(key: K): Promise<V | null>
    set(key: K, value: V): Promise<void>
}

export abstract class FileBasedKVStorage<T> implements KVStorage<Name, T> {
    private readonly codec: t.Decoder<unknown, Record<Name, T>> & t.Encoder<Record<Name, T>, unknown>

    constructor(
        private jsonFilePath: string,
        private valueCodec: t.Type<T>,
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

    protected async load(): Promise<Map<Name, T>> {
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

    protected async save(kv: Map<Name, T>): Promise<void> {
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

export class ClientStorage extends FileBasedKVStorage<Client> {
    constructor(jsonFilePath: string) {
        super(jsonFilePath, ClientType)
    }
}

export class MPSKStorage extends FileBasedKVStorage<CallingStationIdAuthentication> {
    constructor(jsonFilePath: string) {
        super(jsonFilePath, CallingStationIdAuthenticationType)
    }
}
