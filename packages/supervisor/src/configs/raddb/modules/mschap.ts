import { writeFile } from "fs/promises"
import * as path from "node:path"

import { RaddbGenParams } from "../.."
import { dedent } from "../../indents"

export async function generateMschapModule({ raddbPath }: RaddbGenParams): Promise<void> {
    await writeFile(
        path.join(raddbPath, "mods-enabled", "mschap"),
        dedent(`
            mschap {
                use_mppe = yes
                require_encryption = yes
                require_strong = yes
            }
        `),
    )
}
