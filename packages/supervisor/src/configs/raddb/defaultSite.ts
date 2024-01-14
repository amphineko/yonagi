import { writeFile } from "node:fs/promises"
import * as path from "node:path"

import pino from "pino"

import { RaddbGenParams } from ".."
import { dedent } from "../indents"

const logger = pino({ name: `${path.basename(__dirname)}/${path.basename(__filename)}` })

export async function generateDefaultSite({ pki, raddbPath }: RaddbGenParams): Promise<void> {
    const defaultSitePath = path.join(raddbPath, "sites-enabled", "default")

    let eapAuthorize = ""
    let eapAuthenticate = ""
    if (pki) {
        eapAuthorize = `
                    # eap
                    eap {
                        ok = return
                    }
        `
        eapAuthenticate = `
                    eap
                    Auth-Type EAP {
                        eap
                    }
        `
    } else {
        logger.info("No PKI deployed, disabling EAP for default site")
    }

    await writeFile(
        defaultSitePath,
        dedent(`
            server default {

                listen {
                    ipaddr = *
                    type = auth
                    port = 1812
                }
                
                authorize {
                    filter_username
                    filter_password
                    preprocess
                    rewrite_calling_station_id
                    
                    if (!EAP-Message) {
                        # non-802.1x: mac auth
                        rest
                        if (updated) {
                            update control {
                                Auth-Type := Accept
                            }
                        }
                    } else {
                        ${eapAuthorize}
                    }
                }
                
                authenticate {
                    ${eapAuthenticate}
                }
            }
        `),
    )
}
