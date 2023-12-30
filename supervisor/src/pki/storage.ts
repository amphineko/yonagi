import { readFile, writeFile } from "fs/promises"

import { Inject, Injectable, forwardRef } from "@nestjs/common"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"

import { Config } from "../config"

const optional = <T extends t.Mixed>(type: T) => t.union([type, t.undefined])
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

const PkiCertificateStateType = t.type({
    cert: Base64BlobType,
    privKey: optional(Base64BlobType),
})

export type PkiCertificateState = t.TypeOf<typeof PkiCertificateStateType>

const PkiStateStorageType = t.type({
    ca: optional(PkiCertificateStateType),
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
