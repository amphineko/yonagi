import { readFile, writeFile } from "fs/promises"
import * as path from "node:path"

import { RaddbGenParams } from ".."

/**
 * Patches radiusd.conf to show authentication success/failure in the log.
 */
export async function patchAuthLogEnable({ raddbPath }: RaddbGenParams): Promise<void> {
    const filename = path.join(raddbPath, "radiusd.conf")
    const config = await readFile(filename, "utf-8")
    const patched = config.replace(/^(\s{0,})auth = no(\s{0,})$/m, (_, p1, p2) => `${p1}auth = yes${p2}`)
    await writeFile(filename, patched)
}
