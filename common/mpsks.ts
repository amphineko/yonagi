import * as t from "io-ts/lib/index"

import { FileBasedStorage } from "./storage"

const optional = <T extends t.Any>(type: T) => t.union([type, t.undefined])

export const JsonAssociation = t.type({
    ssid: t.string,
    vlan: t.number,
})

export interface Association extends t.TypeOf<typeof JsonAssociation> {}

export const SanitizedName = new t.Type<string, string, unknown>(
    "SanitizedName",
    // is string
    (u): u is string => typeof u === "string",
    // match 1-32 characters of a-z A-Z 0-9 - _
    (u, c) => (typeof u === "string" && /^[a-zA-Z0-9_-]{1,32}$/.test(u) ? t.success(u) : t.failure(u, c)),
    // identity
    (a) => a,
)

export const SanitizedCallingStationId = new t.Type<string, string, unknown>(
    "SanitizedCallingStationId",
    // is string
    (u): u is string => typeof u === "string",
    // match aa:bb:cc:dd:ee:ff and aa-bb-cc-dd-ee-ff
    (u, c) => (typeof u === "string" && /^[0-9a-f]{2}(-[0-9a-f]{2}){5}$/.test(u) ? t.success(u) : t.failure(u, c)),
    // normalize to aa-bb-cc-dd-ee-ff
    (a) => a.toLowerCase().replace(/[:-]/g, "-"),
)

export const SanitizedPSK = new t.Type<string, string, unknown>(
    "SanitizedPSK",
    // is string
    (u): u is string => typeof u === "string",
    // match 8-63 characters of a-z A-Z 0-9 - _
    (u, c) => (typeof u === "string" && /^[a-zA-Z0-9_-]{8,63}$/.test(u) ? t.success(u) : t.failure(u, c)),
    // identity
    (a) => a,
)

export const JsonCallingStationIdAuthentication = t.type({
    name: SanitizedName,
    callingStationId: SanitizedCallingStationId,
    psk: SanitizedPSK,
    allowedAssociations: optional(t.array(JsonAssociation)),
})

export interface CallingStationIdAuthentication extends t.TypeOf<typeof JsonCallingStationIdAuthentication> {}

const JsonMPSKStorage = t.record(t.string, JsonCallingStationIdAuthentication)

export class MPSKStorage extends FileBasedStorage<Record<string, CallingStationIdAuthentication>> {
    async delete(name: string): Promise<void> {
        const mpsks = await this.load()
        delete mpsks[name]
        await this.save(mpsks)
    }

    async get(name: string): Promise<CallingStationIdAuthentication | null> {
        const mpsks = await this.load()
        return mpsks[name] ?? null
    }

    async list(): Promise<CallingStationIdAuthentication[]> {
        const mpsks = await this.load()
        return Object.values(mpsks)
    }

    async set(name: string, mpsk: CallingStationIdAuthentication): Promise<void> {
        const mpsks = await this.load()
        mpsks[name] = mpsk
        await this.save(mpsks)
    }

    constructor(jsonFilePath: string) {
        super(jsonFilePath, JsonMPSKStorage)
    }
}
