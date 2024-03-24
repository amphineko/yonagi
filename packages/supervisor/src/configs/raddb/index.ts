import { generateClients } from "./clients"
import { generateModules } from "./modules"
import { patchAuthLogEnable } from "./radiusdConfig"
import { generateSites } from "./sites"
import { RaddbGenParams } from ".."

export async function generateRaddb(params: RaddbGenParams): Promise<void> {
    await Promise.all([
        generateClients(params),
        generateModules(params),
        generateSites(params),
        patchAuthLogEnable(params),
    ])
}
