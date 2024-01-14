import { Client } from "@yonagi/common/clients"
import { Name } from "@yonagi/common/common"
import { CallingStationIdAuthentication } from "@yonagi/common/mpsks"

import { generateRaddb } from "./raddb"

export interface RaddbGenParams {
    clients: ReadonlyMap<Name, Client>
    pki?: {
        ca: { cert: string }
        server: { cert: string; privKey: string }
    }
    mpsks: ReadonlyMap<Name, CallingStationIdAuthentication>
    raddbPath: string
}

export async function generateConfigs(params: RaddbGenParams): Promise<void> {
    await Promise.all([generateRaddb(params)])
}
