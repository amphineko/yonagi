import { describe, expect, test } from "@jest/globals"
import { NameType } from "@yonagi/common/types/Name"
import { PSKType } from "@yonagi/common/types/mpsks/PSK"
import * as E from "fp-ts/lib/Either"

import { RlmRestMacAuthResponseType } from "./macAuth"

describe("RlmRestMacAuthResponseType", () => {
    test("encodes the MPSK name as User-Name", () => {
        expect(
            RlmRestMacAuthResponseType.encode({
                arubaMpskPassphrase: rightOrThrow(PSKType.decode("secret-passphrase")),
                mediumType: "IEEE-802",
                username: rightOrThrow(NameType.decode("device-entry")),
            }),
        ).toEqual({
            "Aruba-MPSK-Passphrase": {
                type: "string",
                value: ["secret-passphrase"],
            },
            "Tunnel-Medium-Type": {
                type: "string",
                value: ["IEEE-802"],
            },
            "User-Name": {
                type: "string",
                value: ["device-entry"],
            },
        })
    })
})

function rightOrThrow<T>(e: E.Either<unknown, T>): T {
    if (E.isLeft(e)) {
        throw new Error("Expected right")
    }
    return e.right
}
