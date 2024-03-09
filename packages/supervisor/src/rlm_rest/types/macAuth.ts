import { CallingStationId, CallingStationIdType } from "@yonagi/common/types/mpsks/CallingStationId"
import { PSK, PSKType } from "@yonagi/common/types/mpsks/PSK"
import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as t from "io-ts"

import { attribute } from "./common"

export interface RlmRestMacAuthRequest {
    callingStationId: CallingStationId
}

const EncodedRlmRestMacAuthRequest = t.type({
    "Calling-Station-Id": attribute("MacAddr", "string", CallingStationIdType),
})

export const RlmRestMacAuthRequestType = new t.Type<
    RlmRestMacAuthRequest,
    t.TypeOf<typeof EncodedRlmRestMacAuthRequest>
>(
    "RlmRestMacAuthRequest",
    (u): u is RlmRestMacAuthRequest => {
        throw new Error("Type guard is not implemented")
    },
    (u, c) =>
        F.pipe(
            EncodedRlmRestMacAuthRequest.validate(u, c),
            E.map(({ "Calling-Station-Id": callingStationId }) => ({ callingStationId })),
        ),
    () => {
        throw new Error("Encoding of this type is unnecessary")
    },
)

export interface RlmRestMacAuthResponse {
    arubaMpskPassphrase: PSK
    mediumType: "IEEE-802"
}

const BaseRlmRestMacAuthResponse = t.type({
    arubaMpskPassphrase: PSKType,
    mediumType: t.literal("IEEE-802"),
})

const EncodedRlmRestMacAuthResponseType = t.type({
    "Aruba-MPSK-Passphrase": attribute("MpskPassphrase", "string", t.string),
    "Tunnel-Medium-Type": attribute("TunnelMediumType", "string", t.literal("IEEE-802")),
})

export type EncodedRlmRestMacAuthResponse = t.OutputOf<typeof EncodedRlmRestMacAuthResponseType>

export const RlmRestMacAuthResponseType = new t.Type<
    RlmRestMacAuthResponse,
    t.OutputOf<typeof EncodedRlmRestMacAuthResponseType>
>(
    "RlmRestMacAuthResponse",
    (u): u is RlmRestMacAuthResponse => BaseRlmRestMacAuthResponse.is(u),
    () => {
        throw new Error("Decoding of this type is unnecessary")
    },
    ({ arubaMpskPassphrase }) =>
        EncodedRlmRestMacAuthResponseType.encode({
            "Aruba-MPSK-Passphrase": arubaMpskPassphrase,
            "Tunnel-Medium-Type": "IEEE-802",
        }),
)
