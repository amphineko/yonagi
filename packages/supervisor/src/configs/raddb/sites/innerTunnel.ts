import { writeFile } from "node:fs/promises"
import * as path from "node:path"

import pino from "pino"

import { RaddbGenParams } from "../.."
import { dedent } from "../../indents"

const logger = pino({ name: `${path.basename(__dirname)}/${path.basename(__filename)}` })

export async function generateInnerTunnelSite({ pki, raddbPath }: RaddbGenParams): Promise<void> {
    const filePath = path.join(raddbPath, "sites-enabled", "inner-tunnel")

    if (!pki) {
        await writeFile(filePath, "")
        logger.info("No PKI deployed, disabling EAP for inner-tunnel site")
        return
    }

    await writeFile(
        filePath,
        dedent(`
            server inner-tunnel {

                listen {
                    ipaddr = *
                    type = auth
                    port = 18120
                }

                authorize {
                    filter_username
                    filter_password
                    preprocess

                    rest_passwords
                    inner-eap {
                        ok = return
                    }
                }

                authenticate {
                    # EAP-PEAP-GTC
                    Auth-Type PAP {
                        pap
                    }

                    # EAP-PEAP-MSCHAPv2
                    Auth-Type MS-CHAP {
                        mschap
                    }

                    inner-eap
                }
            }
        `),
    )
}
