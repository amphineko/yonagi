import { writeFile } from "node:fs/promises"
import * as path from "node:path"

import { IpNetworkFromStringType } from "@yonagi/common/common"
import * as RM from "fp-ts/lib/ReadonlyMap"
import * as F from "fp-ts/lib/function"

import { RaddbGenParams } from ".."
import { dedent } from "../indents"

export function generateClient(name: string, ip: string, secret: string): string {
    return dedent(`
        client ${name} {
            ipaddr = ${ip}
            proto = udp
            secret = '${secret}'
            require_message_authenticator = no
        }
    `)
}

export async function generateClients({ clients, raddbPath }: RaddbGenParams): Promise<void> {
    const filename = path.join(raddbPath, "clients.conf")
    await F.pipe(
        clients,
        RM.mapWithIndex((name, { ipaddr, secret }) =>
            generateClient(name, IpNetworkFromStringType.encode(ipaddr), secret),
        ),
        (fragments) => Array.from(fragments.values()).join("\n"),
        (content) => writeFile(filename, content, { encoding: "utf-8" }),
    )
}
