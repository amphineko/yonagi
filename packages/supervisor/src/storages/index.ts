import { Client } from "@yonagi/common/types/Client"
import { Name } from "@yonagi/common/types/Name"
import { CallingStationId } from "@yonagi/common/types/mpsks/CallingStationId"
import { CallingStationIdAuthentication } from "@yonagi/common/types/mpsks/MPSK"

export abstract class AbstractClientStorage {
    abstract all(): Promise<readonly Client[]>

    abstract bulkCreateOrUpdate(values: readonly Client[]): Promise<void>

    abstract createOrUpdateByName(name: Name, value: Client): Promise<void>

    abstract deleteByName(name: Name): Promise<boolean>

    abstract getByName(name: Name): Promise<Client | null>
}

export abstract class AbstractMPSKStorage {
    abstract all(): Promise<readonly CallingStationIdAuthentication[]>

    abstract bulkCreateOrUpdate(values: readonly CallingStationIdAuthentication[]): Promise<void>

    abstract createOrUpdateByName(name: Name, value: CallingStationIdAuthentication): Promise<void>

    abstract deleteByName(name: Name): Promise<boolean>

    abstract getByCallingStationId(callingStationId: CallingStationId): Promise<CallingStationIdAuthentication | null>

    abstract getByName(name: Name): Promise<CallingStationIdAuthentication | null>
}
