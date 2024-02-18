import { generateClients } from "./clients"
import { generateEapModule } from "./modules/eapModule"
import { generateRestModule } from "./modules/restModule"
import { patchAuthLogEnable } from "./radiusdConfig"
import { generateDefaultSite } from "./sites/defaultSite"
import { generateDynamicClientSite } from "./sites/dynClientSite"
import { RaddbGenParams } from ".."

export async function generateRaddb(params: RaddbGenParams): Promise<void> {
    await Promise.all([
        generateClients(params),
        generateDynamicClientSite(params),
        generateDefaultSite(params),
        generateEapModule(params),
        generateRestModule(params),
        patchAuthLogEnable(params),
    ])
}
