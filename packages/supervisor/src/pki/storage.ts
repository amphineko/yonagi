import { readFile, writeFile } from "fs/promises"

import { Inject, Injectable, forwardRef } from "@nestjs/common"
import { MapFromRecordType } from "@yonagi/common/api/common"
import { SerialNumberString, SerialNumberStringType } from "@yonagi/common/pki"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"

import { Config } from "../config"

type Optional<T> = T | undefined

const Base64BlobType = new t.Type<ArrayBuffer, string, unknown>(
    "Base64Blob",
    (u): u is ArrayBuffer => u instanceof ArrayBuffer,
    // decode from base64 string to ArrayBuffer
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.flatMap((s) => {
                try {
                    return t.success(Buffer.from(s, "base64"))
                } catch (e) {
                    return t.failure(u, c, String(e))
                }
            }),
        ),
    // encode from ArrayBuffer to base64 string
    (a) => Buffer.from(a).toString("base64"),
)

const PkiCertificateStateType = t.intersection([
    t.type({ cert: Base64BlobType }),
    t.partial({ privKey: Base64BlobType }),
]) as t.Type<{ cert: ArrayBuffer; privKey?: ArrayBuffer }, { cert: string; privKey?: string }>

export type PkiCertificateState = t.TypeOf<typeof PkiCertificateStateType>

const PkiStateStorageType = t.partial({
    ca: PkiCertificateStateType,
    server: PkiCertificateStateType,
    clients: MapFromRecordType(SerialNumberStringType, PkiCertificateStateType),
})

type PkiStateStorage = t.TypeOf<typeof PkiStateStorageType>

@Injectable()
export class PkiState {
    constructor(@Inject(forwardRef(() => Config)) private readonly config: Config) {}

    public async getCertificateAuthority(): Promise<Optional<PkiCertificateState>> {
        return (await this.load()).ca
    }

    public async setCertificateAuthority(state: Optional<PkiCertificateState>): Promise<void> {
        await this.save({
            ...(await this.load()),
            ca: state,
        })
    }

    public async getServerCertificate(): Promise<Optional<PkiCertificateState>> {
        return (await this.load()).server
    }

    public async setServerCertificate(state: Optional<PkiCertificateState>): Promise<void> {
        await this.save({
            ...(await this.load()),
            server: state,
        })
    }

    public async getClientCertificate(serial: SerialNumberString): Promise<Optional<PkiCertificateState>> {
        const store = await this.load()
        return store.clients?.get(serial)
    }

    public async setClientCertificate(serial: SerialNumberString, state: Optional<PkiCertificateState>): Promise<void> {
        const store = await this.load()

        const clients = new Map(store.clients?.entries() ?? [])
        if (state) {
            clients.set(serial, state)
        } else {
            clients.delete(serial)
        }

        await this.save({
            ...store,
            clients,
        })
    }

    public async allClientCertificates(): Promise<Map<SerialNumberString, PkiCertificateState>> {
        const store = await this.load()
        return new Map(store.clients?.entries() ?? [])
    }

    private async load(): Promise<PkiStateStorage> {
        return await F.pipe(
            TE.tryCatch(async () => {
                try {
                    const json = await readFile(this.config.pkiStatePath, { encoding: "utf-8" })
                    return JSON.parse(json) as unknown
                } catch (e) {
                    if (e instanceof Error && "code" in e && e.code === "ENOENT") {
                        return {}
                    }
                }
            }, E.toError),
            TE.flatMapEither(
                F.flow(
                    (obj) => PkiStateStorageType.decode(obj),
                    E.mapLeft((errors) => new Error(PR.failure(errors).join("\n"))),
                ),
            ),
            TE.getOrElse((err) => {
                throw err
            }),
        )()
    }

    private async save(state: PkiStateStorage): Promise<void> {
        const encoded = PkiStateStorageType.encode(state)
        await writeFile(this.config.pkiStatePath, JSON.stringify(encoded), { encoding: "utf-8" })
    }
}
