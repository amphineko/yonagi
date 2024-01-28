import { writeFile } from "node:fs/promises"
import * as path from "node:path"

import { RaddbGenParams } from ".."

export async function generateClients({ raddbPath }: RaddbGenParams): Promise<void> {
    const filename = path.join(raddbPath, "clients.conf")
    await writeFile(filename, "")
}
