import { writeFile } from "node:fs/promises"
import * as path from "node:path"

import { IpNetworkFromStringType } from "@yonagi/common/types/IpNetworkFromString"
import { NameType } from "@yonagi/common/types/Name"
import { SecretType } from "@yonagi/common/types/Secret"
import * as RA from "fp-ts/lib/ReadonlyArray"
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
        RA.map(({ name, ipaddr, secret }) => [
            generateClient(NameType.encode(name), IpNetworkFromStringType.encode(ipaddr), SecretType.encode(secret)),
        ]),
        (fragments) => Array.from(fragments.values()).join("\n"),
        (content) => writeFile(filename, content, { encoding: "utf-8" }),
    )
}
