import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, test } from "@jest/globals"
import { NameType } from "@yonagi/common/types/Name"
import { CallingStationIdType } from "@yonagi/common/types/mpsks/CallingStationId"
import { CallingStationIdAuthentication } from "@yonagi/common/types/mpsks/MPSK"
import { PSKType } from "@yonagi/common/types/mpsks/PSK"
import * as E from "fp-ts/lib/Either"

import { FileBasedMPSKStorage } from "./files"

describe("MPSK storage pending allocation", () => {
    test("returns exact matches before claiming a pending slot", async () => {
        await withStorage(
            [mpsk("known", "aa-bb-cc-dd-ee-ff", "knownpass"), mpsk("pending", "00-00-00-00-00-00", "pendingpass")],
            async (storage) => {
                const result = await storage.getByCallingStationIdOrClaimPending(
                    rightOrThrow(CallingStationIdType.decode("aa-bb-cc-dd-ee-ff")),
                )

                expect(result).toEqual(mpsk("known", "aa-bb-cc-dd-ee-ff", "knownpass"))
                expect(await storage.all()).toEqual([
                    mpsk("known", "aa-bb-cc-dd-ee-ff", "knownpass"),
                    mpsk("pending", "00-00-00-00-00-00", "pendingpass"),
                ])
            },
        )
    })

    test("claims a pending slot for an unknown MAC", async () => {
        await withStorage([mpsk("pending", "00-00-00-00-00-00", "pendingpass")], async (storage) => {
            const result = await storage.getByCallingStationIdOrClaimPending(
                rightOrThrow(CallingStationIdType.decode("11-22-33-44-55-66")),
            )

            expect(result).toEqual(mpsk("pending", "11-22-33-44-55-66", "pendingpass"))
            expect(await storage.all()).toEqual([mpsk("pending", "11-22-33-44-55-66", "pendingpass")])
        })
    })

    test("claims pending slots in storage order", async () => {
        await withStorage(
            [
                mpsk("pending1", "00-00-00-00-00-00", "pendingpass1"),
                mpsk("pending2", "00-00-00-00-00-00", "pendingpass2"),
            ],
            async (storage) => {
                const first = await storage.getByCallingStationIdOrClaimPending(
                    rightOrThrow(CallingStationIdType.decode("11-22-33-44-55-66")),
                )
                const second = await storage.getByCallingStationIdOrClaimPending(
                    rightOrThrow(CallingStationIdType.decode("22-33-44-55-66-77")),
                )

                expect(first).toEqual(mpsk("pending1", "11-22-33-44-55-66", "pendingpass1"))
                expect(second).toEqual(mpsk("pending2", "22-33-44-55-66-77", "pendingpass2"))
            },
        )
    })

    test("returns null when there is no exact match or pending slot", async () => {
        await withStorage([mpsk("known", "aa-bb-cc-dd-ee-ff", "knownpass")], async (storage) => {
            await expect(
                storage.getByCallingStationIdOrClaimPending(
                    rightOrThrow(CallingStationIdType.decode("11-22-33-44-55-66")),
                ),
            ).resolves.toBeNull()
        })
    })
})

async function withStorage(
    records: readonly CallingStationIdAuthentication[],
    f: (storage: FileBasedMPSKStorage) => Promise<void>,
): Promise<void> {
    const dir = await mkdtemp(join(tmpdir(), "yonagi-mpsks-"))
    const jsonFilePath = join(dir, "mpsks.json")

    try {
        await writeFile(jsonFilePath, JSON.stringify(records, undefined, 4))
        await f(new FileBasedMPSKStorage(jsonFilePath))
    } finally {
        await rm(dir, { recursive: true, force: true })
    }
}

function mpsk(name: string, callingStationId: string, psk: string): CallingStationIdAuthentication {
    return {
        name: rightOrThrow(NameType.decode(name)),
        callingStationId: rightOrThrow(CallingStationIdType.decode(callingStationId)),
        psk: rightOrThrow(PSKType.decode(psk)),
    }
}

function rightOrThrow<T>(e: E.Either<unknown, T>): T {
    if (E.isLeft(e)) {
        throw new Error("Expected right")
    }

    return e.right
}
