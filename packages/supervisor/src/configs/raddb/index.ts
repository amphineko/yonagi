import { generateClients } from "./clients"
import { generateDefaultSite } from "./defaultSite"
import { generateEapModule } from "./eapModule"
import { patchAuthLogEnable } from "./radiusdConfig"
import { generateRestModule } from "./restModule"
import { RaddbGenParams } from ".."

export async function generateRaddb(params: RaddbGenParams): Promise<void> {
    await Promise.all([
        generateClients(params),
        generateDefaultSite(params),
        generateEapModule(params),
        generateRestModule(params),
        patchAuthLogEnable(params),
    ])
}
