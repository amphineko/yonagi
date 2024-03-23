import { writeFile } from "fs/promises"
import * as path from "node:path"

import pino from "pino"

import { RaddbGenParams } from "../.."
import { dedent } from "../../indents"

const logger = pino({ name: `${path.basename(__dirname)}/${path.basename(__filename)}` })

export async function generateEapModule({ pki, raddbPath }: RaddbGenParams): Promise<void> {
    const configPath = path.join(raddbPath, "mods-enabled", "eap")

    if (!pki) {
        await writeFile(configPath, "")
        logger.info("No PKI deployed, disabling EAP module")
        return
    }

    const {
        ca: { cert: caCert },
        server: { cert: serverCert, privKey: serverPrivKey },
    } = pki

    await writeFile(
        configPath,
        dedent(`
            eap outer-eap {
                default_eap_type = peap
                type = peap
                type = tls

                timer_expire = 60
                max_sessions = \${max_requests}

                tls-config tls-common {
                    private_key_file = ${serverPrivKey}
                    certificate_file = ${serverCert}

                    ca_file = ${caCert}
                    check_crl = no

                    auto_chain = yes

                    cipher_list = "ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:HIGH"
                    cipher_server_preference = yes

                    tls_min_version = "1.2"
                    tls_max_version = "1.3"

                    ecdh_curve = "secp384r1"

                    verify { }

                    ocsp {
                        enable = no
                    }
                }

                tls {
                    tls = tls-common
                }
                
                peap {
                    tls = tls-common
                    default_eap_type = mschapv2
                    virtual_server = "inner-tunnel"
                    copy_request_to_tunnel = yes
                }
            }

            eap inner-eap {
                default_eap_type = gtc
                type = gtc
                type = mschapv2

                gtc {
                    auth_type = PAP
                }

                mschapv2 {
                    send_error = yes
                }
            }
        `),
    )
}
