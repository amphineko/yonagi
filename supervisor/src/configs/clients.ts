import { writeFile } from "fs/promises"
import { basename } from "path"

import { Client } from "@yonagi/common/clients"
import { IpNetworkFromStringType, Name } from "@yonagi/common/common"
import * as RM from "fp-ts/lib/ReadonlyMap"
import * as F from "fp-ts/lib/function"
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

export function makeClients(clients: ReadonlyMap<Name, Client>): string {
    return F.pipe(
        clients,
        RM.mapWithIndex((name, { ipaddr, secret }) => makeClient(name, IpNetworkFromStringType.encode(ipaddr), secret)),
        (configs) => Array.from(configs.values()).join("\n"),
    )
}

export async function generateClientsFile(clients: ReadonlyMap<Name, Client>, outputPath: string): Promise<void> {
    const output = makeClients(clients)
    await writeFile(outputPath, output, { encoding: "utf-8" })
    logger.info(`Written clients.conf to ${outputPath}`)
}
