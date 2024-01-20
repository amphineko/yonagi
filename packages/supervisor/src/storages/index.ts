import { CallingStationId } from "@yonagi/common/types/CallingStationId"
import { Client } from "@yonagi/common/types/Client"
import { CallingStationIdAuthentication } from "@yonagi/common/types/MPSK"
import { Name } from "@yonagi/common/types/Name"

export abstract class AbstractClientStorage {
    abstract all(): Promise<readonly Client[]>

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
