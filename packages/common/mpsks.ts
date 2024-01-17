import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

import { Name, NameType } from "./common"

export const CallingStationIdType = new t.Type<string, string, unknown>(
    "CallingStationId",
    // is string
    (u): u is string => typeof u === "string",
    // match and normalize to aa-bb-cc-dd-ee-ff
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.map((s) => s.replace(/[:-]/g, "-").toLowerCase().split("-")),
            E.chain((a) =>
                a.length === 6 && a.every((s) => /^[0-9a-f]{2}$/.test(s))
                    ? E.right(a.join("-"))
                    : t.failure("Input is not a valid MAC address", c),
            ),
        ),
    // normalize to aa-bb-cc-dd-ee-ff
    (a) => a.toLowerCase().replace(/[:-]/g, "-"),
)

export type CallingStationId = t.TypeOf<typeof CallingStationIdType>

export const PSKType = new t.Type<string, string, unknown>(
    "PSK",
    // is string
    (u): u is string => typeof u === "string",
    // match 8-63 characters of a-z A-Z 0-9 - _
    (u, c) => (typeof u === "string" && /^[a-zA-Z0-9_-]{8,63}$/.test(u) ? t.success(u) : t.failure(u, c)),
    // identity
    (a) => a,
)

export type PSK = t.TypeOf<typeof PSKType>

export interface CallingStationIdAuthentication {
    callingStationId: CallingStationId
    name: Name
    psk: PSK
    ssid?: string
    vlan?: number
}

export const CallingStationIdAuthenticationType: t.Type<CallingStationIdAuthentication> = t.intersection([
    t.type({
        callingStationId: CallingStationIdType,
        name: NameType,
        psk: PSKType,
    }),
    t.partial({
        ssid: t.string,
        vlan: t.number,
    }),
])
