import { writeFile } from "fs/promises"
import * as path from "node:path"

import { RaddbGenParams } from ".."
import { dedent } from "../indents"

export async function generateRestModule({ raddbPath }: RaddbGenParams): Promise<void> {
    const configPath = path.join(raddbPath, "mods-enabled", "rest")

    await writeFile(
        configPath,
        dedent(`
            rest {
                # TODO(amphineko): override connect_uri with actual listen host and port
                connect_uri = "http://localhost:8000/api/v1/rlm_rest"

                authorize {
                    uri = "\${..connect_uri}/authorize"
                    method = 'post'
                    body = 'json'
                }
            }
        `),
    )
}
