import { generateClients } from "./clients"
import { generateDefaultSite } from "./defaultSite"
import { generateEapModule } from "./eapModule"
import { patchAuthLogEnable } from "./radiusdConfig"
import { RaddbGenParams } from ".."

export async function generateRaddb(params: RaddbGenParams): Promise<void> {
    await Promise.all([
        generateClients(params),
        generateDefaultSite(params),
        generateEapModule(params),
        patchAuthLogEnable(params),
    ])
}
