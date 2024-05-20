import { Username, UsernameType } from "@yonagi/common/types/users/Username"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

import { attribute } from "./common"

export interface RlmRestPasswordAuthRequest {
    username: Username
}

const BaseRlmRestPasswordAuthRequest = t.partial({
    username: t.string,
})

const EncodedRlmRestPasswordAuthRequest = t.type({
    "User-Name": attribute("Username", "string", UsernameType),
})

export const RlmRestPasswordAuthRequestType = new t.Type<
    RlmRestPasswordAuthRequest,
    t.OutputOf<typeof EncodedRlmRestPasswordAuthRequest>
>(
    "RlmRestPasswordAuthRequest",
    (u): u is RlmRestPasswordAuthRequest => E.isRight(BaseRlmRestPasswordAuthRequest.validate(u, [])),
    (u, c) =>
        F.pipe(
            EncodedRlmRestPasswordAuthRequest.validate(u, c),
            E.map(({ "User-Name": username }) => ({ username })),
        ),
    () => {
        throw new Error("Encoding of this type is unnecessary")
    },
)

export interface RlmRestPasswordAuthResponse {
    cleartext?: string
    nt?: string
    ssha?: string
    ssha512?: string
}

const BaseRlmRestPasswordAuthResponse = t.partial({
    cleartext: t.string,
    nt: t.string,
    ssha: t.string,
    ssha512: t.string,
})

const EncodedRlmRestPasswordAuthResponseType = t.partial({
    "control:Cleartext-Password": attribute("Cleartext-Password", "string", t.string),
    "control:LM-Password": attribute("LM-Password", "string", t.string),
    "control:NT-Password": attribute("NT-Password", "string", t.string),
    "control:SSHA-Password": attribute("SSHA-Password", "string", t.string),
    "control:SSHA2-512-Password": attribute("SSHA2-512-Password", "string", t.string),
})

export const RlmRestPasswordAuthResponseType = new t.Type<
    RlmRestPasswordAuthResponse,
    t.OutputOf<typeof EncodedRlmRestPasswordAuthResponseType>
>(
    "RlmRestPasswordAuthResponse",
    (u): u is RlmRestPasswordAuthResponse => E.isRight(BaseRlmRestPasswordAuthResponse.validate(u, [])),
    () => {
        throw new Error("Decoding of this type is unnecessary")
    },
    ({ cleartext, nt, ssha, ssha512 }) => {
        const response: t.TypeOf<typeof EncodedRlmRestPasswordAuthResponseType> = {}
        if (cleartext) response["control:Cleartext-Password"] = cleartext
        if (nt) response["control:NT-Password"] = `0x${nt}`
        if (ssha) response["control:SSHA-Password"] = ssha
        if (ssha512) response["control:SSHA2-512-Password"] = ssha512
        return EncodedRlmRestPasswordAuthResponseType.encode(response)
    },
)
