import { CallingStationId, CallingStationIdType } from "@yonagi/common/types/CallingStationId"
import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as t from "io-ts"

const AttributeType = t.type({
    type: t.string,
    value: t.array(t.union([t.string, t.number])),
})

const RawRlmRestRequestType = t.type({
    "Calling-Station-Id": AttributeType,
    "User-Name": AttributeType,
})

export interface RlmRestRequest {
    callingStationId: CallingStationId
    userName: string
}

export const RlmRestRequestType = new t.Type<RlmRestRequest, unknown, unknown>(
    "RlmRestRequest",
    (u): u is RlmRestRequest => {
        throw new Error("Validation is unnecessary and not supported")
    },
    (u, c) =>
        F.pipe(
            RawRlmRestRequestType.validate(u, c),
            E.chain(({ "Calling-Station-Id": callingStationId, "User-Name": userName }) =>
                F.pipe(
                    E.Do,
                    E.bind("callingStationId", () => CallingStationIdType.validate(callingStationId.value[0], c)),
                    E.bind("userName", () => E.right(String(userName.value[0]))),
                ),
            ),
        ),
    () => {
        throw new Error("Re-encoding is unnecessary and not supported")
    },
)

export const RawRlmRestResponseType = t.partial({
    "Aruba-MPSK-Passphrase": AttributeType,
    "Tunnel-Medium-Type": AttributeType,
    "Tunnel-Private-Group-Id": AttributeType,
    "Tunnel-Type": AttributeType,
})

export type RawRlmRestResponse = t.TypeOf<typeof RawRlmRestResponseType>
