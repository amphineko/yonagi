import { Client } from "@yonagi/common/clients"

import { generateRaddb } from "./raddb"

export interface RaddbGenParams {
    clients: readonly Client[]
    pki?: {
        ca: { cert: string }
        server: { cert: string; privKey: string }
    }
    raddbPath: string
}

export async function generateConfigs(params: RaddbGenParams): Promise<void> {
    await Promise.all([generateRaddb(params)])
}
