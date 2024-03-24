import { writeFile } from "node:fs/promises"
import * as path from "node:path"

import { RaddbGenParams } from "../.."
import { dedent } from "../../indents"

export async function generateDynamicClientSite({ raddbPath }: RaddbGenParams): Promise<void> {
    const dynClientSitePath = path.join(raddbPath, "sites-enabled", "dynamic-clients")

    await writeFile(
        dynClientSitePath,
        dedent(`
            client dynamic-v4 {
                ipaddr = 0.0.0.0
                netmask = 0

                dynamic_clients = dyn_client_server
                lifetime = 1
            }

            server dyn_client_server {
                authorize {
                    update request {
                        &FreeRADIUS-Client-IP-Address = "%{Packet-Src-IP-Address}"
                    }

                    rest_dyn_clients
                    if (updated) {
                        update control {
                            &FreeRADIUS-Client-IP-Address = "%{Packet-Src-IP-Address}"
                            &FreeRADIUS-Client-Secret = "%{reply:FreeRADIUS-Client-Secret}"
                            &FreeRADIUS-Client-Shortname = "%{reply:FreeRADIUS-Client-Shortname}"
                        }
                    }
                }
            }
        `),
    )
}
