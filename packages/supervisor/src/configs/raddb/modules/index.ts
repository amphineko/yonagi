import { generateEapModule } from "./eap"
import { generateMschapModule } from "./mschap"
import { generateRestModule } from "./rest"
import { RaddbGenParams } from "../.."

export async function generateModules(params: RaddbGenParams): Promise<void> {
    await Promise.all([generateEapModule(params), generateMschapModule(params), generateRestModule(params)])
}
