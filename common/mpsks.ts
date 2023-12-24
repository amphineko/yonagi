import * as t from "io-ts/lib/index"

const optional = <T extends t.Any>(type: T) => t.union([type, t.undefined])

export const JsonAssociation = t.type({
    ssid: t.string,
    vlan: t.number,
})

export type Association = t.TypeOf<typeof JsonAssociation>

export const CallingStationIdType = new t.Type<string, string, unknown>(
    "CallingStationId",
    // is string
    (u): u is string => typeof u === "string",
    // match aa:bb:cc:dd:ee:ff and aa-bb-cc-dd-ee-ff
    (u, c) => (typeof u === "string" && /^[0-9a-f]{2}(-[0-9a-f]{2}){5}$/.test(u) ? t.success(u) : t.failure(u, c)),
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

export const CallingStationIdAuthenticationType = t.type({
    callingStationId: CallingStationIdType,
    psk: PSKType,
    allowedAssociations: optional(t.array(JsonAssociation)),
})

export type CallingStationIdAuthentication = t.TypeOf<typeof CallingStationIdAuthenticationType>
