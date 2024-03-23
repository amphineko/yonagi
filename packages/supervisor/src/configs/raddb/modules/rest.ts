import { writeFile } from "fs/promises"
import * as path from "node:path"

import { RaddbGenParams } from "../.."
import { dedent } from "../../indents"

function createRestModule(name: string, endpoint: string, baseUrl: string) {
    const url = new URL(endpoint, baseUrl).toString()
    return dedent(`
        rest rest_${name} {
            connect_uri = "${url}"

            authorize {
                uri = "\${..connect_uri}/authorize"
                method = 'post'
                body = 'json'
            }
        }
    `)
}

export async function generateRestModule({ raddbPath }: RaddbGenParams): Promise<void> {
    const baseUrl = "http://localhost:8000/api/v1/rlm_rest/"
    const modules = [
        // dynamic clients
        createRestModule("dyn_clients", "clients", baseUrl),
        // mac auth
        createRestModule("mac_auth", "mac", baseUrl),
        // password-based eap
        createRestModule("passwords", "passwords", baseUrl),
    ]

    const configPath = path.join(raddbPath, "mods-enabled", "rest")
    await writeFile(configPath, modules.join("\n"))
}
