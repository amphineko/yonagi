import * as t from "io-ts/lib/index"

import { FileBasedStorage } from "./storage"

const optional = <T extends t.Any>(type: T) => t.union([type, t.undefined])

export const JsonAssociation = t.type({
    ssid: t.string,
    vlan: t.number,
})

export interface Association extends t.TypeOf<typeof JsonAssociation> {}

export const JsonCallingStationIdAuthentication = t.type({
    callingStationId: t.string,
    name: t.string,
    psk: t.string,
    allowedAssociations: optional(t.array(JsonAssociation)),
})

export interface CallingStationIdAuthentication extends t.TypeOf<typeof JsonCallingStationIdAuthentication> {}

const JsonMPSKStorage = t.record(t.string, JsonCallingStationIdAuthentication)

export class MPSKStorage extends FileBasedStorage<Record<string, CallingStationIdAuthentication>> {
    async delete(hwaddr: string): Promise<void> {
        const mpsks = await this.load()
        delete mpsks[hwaddr]
        await this.save(mpsks)
    }

    async get(hwaddr: string): Promise<CallingStationIdAuthentication | null> {
        const mpsks = await this.load()
        return mpsks[hwaddr] ?? null
    }

    async list(): Promise<CallingStationIdAuthentication[]> {
        const mpsks = await this.load()
        return Object.values(mpsks)
    }

    async set(hwaddr: string, name: string, psk: string, associations?: Association[]): Promise<void> {
        const mpsks = await this.load()
        mpsks[hwaddr] = {
            callingStationId: hwaddr,
            name,
            psk,
            allowedAssociations: associations,
        }
        await this.save(mpsks)
    }

    constructor(jsonFilePath: string) {
        super(jsonFilePath, JsonMPSKStorage)
    }
}
