import { Client } from "@yonagi/common/clients"
import { Name } from "@yonagi/common/common"
import { CallingStationId, CallingStationIdAuthentication } from "@yonagi/common/mpsks"

export abstract class AbstractClientStorage {
    abstract all(): Promise<ReadonlyMap<Name, Client>>

    abstract createOrUpdateByName(name: Name, value: Client): Promise<void>

    abstract deleteByName(name: Name): Promise<boolean>

    abstract getByName(name: Name): Promise<Client | null>
}

export abstract class AbstractMPSKStorage {
    abstract all(): Promise<readonly CallingStationIdAuthentication[]>

    abstract createOrUpdateByName(name: Name, value: CallingStationIdAuthentication): Promise<void>

    abstract deleteByName(name: Name): Promise<boolean>

    abstract getByCallingStationId(callingStationId: CallingStationId): Promise<CallingStationIdAuthentication | null>

    abstract getByName(name: Name): Promise<CallingStationIdAuthentication | null>
}
