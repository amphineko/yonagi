import { IpAddress } from "@yonagi/common/types/IpAddress"
import { IpAddressFromStringType } from "@yonagi/common/types/IpAddressFromString"
import { Name, NameType } from "@yonagi/common/types/Name"
import { Secret, SecretType } from "@yonagi/common/types/Secret"
import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as t from "io-ts"

import { attribute } from "./common"

export interface RlmRestClientAuthRequest {
    clientIpAddr: IpAddress
}

const EncodedRlmRestClientAuthRequest = t.type({
    "FreeRADIUS-Client-IP-Address": attribute("IpAddress", "ipaddr", IpAddressFromStringType),
})

export const RlmRestClientAuthRequestType = new t.Type<
    RlmRestClientAuthRequest,
    t.OutputOf<typeof EncodedRlmRestClientAuthRequest>
>(
    "RlmRestClientAuthRequest",
    (u): u is RlmRestClientAuthRequest => {
        throw new Error("Type guard is not implemented")
    },
    (u, c) => {
        return F.pipe(
            EncodedRlmRestClientAuthRequest.validate(u, c),
            E.map(({ "FreeRADIUS-Client-IP-Address": clientIpAddr }) => ({ clientIpAddr })),
        )
    },
    () => {
        throw new Error("Encoding of this type is unnecessary")
    },
)

export interface RlmRestClientAuthResponse {
    name: Name
    secret: Secret
}

const BaseRlmRestClientAuthResponse = t.type({
    name: NameType,
    secret: SecretType,
})

const EncodedRlmRestClientAuthResponseType = t.type({
    "FreeRADIUS-Client-Secret": attribute("Secret", "string", t.string),
    "FreeRADIUS-Client-Shortname": attribute("Name", "string", t.string),
})

export const RlmRestClientAuthResponseType = new t.Type<
    RlmRestClientAuthResponse,
    t.OutputOf<typeof EncodedRlmRestClientAuthResponseType>
>(
    "RlmRestClientAuthResponse",
    (u): u is RlmRestClientAuthResponse => E.isRight(BaseRlmRestClientAuthResponse.validate(u, [])),
    () => {
        throw new Error("Decoding of this type is unnecessary")
    },
    ({ name, secret }) =>
        EncodedRlmRestClientAuthResponseType.encode({
            "FreeRADIUS-Client-Secret": secret,
            "FreeRADIUS-Client-Shortname": name,
        }),
)
