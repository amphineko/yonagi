import { writeFile } from "fs/promises"
import { basename } from "path"

import { Client } from "@yonagi/common/clients"
import { pino } from "pino"

import { dedent } from "./indents"

const logger = pino({ name: `${basename(__dirname)}/${basename(__filename)}` })

export function makeClient(name: string, ip: string, secret: string): string {
    return dedent(`
        client ${name} {
            ipaddr = ${ip}
            proto = udp
            secret = '${secret}'
            require_message_authenticator = no
        }
    `)
}

export function makeClients(clients: Client[]): string {
    return clients.map(({ name, ipaddr, secret }) => makeClient(name, ipaddr, secret)).join("\n")
}

export async function generateClientsFile(clients: Client[], outputPath: string): Promise<void> {
    const output = makeClients(clients)
    await writeFile(outputPath, output, { encoding: "utf-8" })
    logger.info(`Written clients.conf to ${outputPath}`)
}
