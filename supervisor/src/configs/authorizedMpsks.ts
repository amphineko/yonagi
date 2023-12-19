import { writeFile } from "fs/promises"
import { basename } from "path"

import { Name } from "@yonagi/common/common"
import { CallingStationIdAuthentication } from "@yonagi/common/mpsks"
import * as RM from "fp-ts/lib/ReadonlyMap"
import * as F from "fp-ts/lib/function"
import { pino } from "pino"

import { dedent } from "./indents"

const logger = pino({ name: `${basename(__dirname)}/${basename(__filename)}` })

export function makeAuthorizedMpsk(
    callingStationId: string,
    psk: string,
    vlanId = 0,
    vlanAttribute = "Tunnel-Private-Group-Id",
    tunnelType = "VLAN",
    tunnelMediumType = "IEEE-802",
): string {
    if (callingStationId.search(/^([A-F0-9]{2}-){5}[A-F0-9]{2}$/) === -1) {
        throw new Error(`Malformed MAC address: ${callingStationId}`)
    }

    return dedent(`
        ${callingStationId}
            Tunnel-Medium-Type = ${tunnelMediumType},
            ${vlanAttribute} = ${vlanId},
            Tunnel-Type = ${tunnelType},
            Aruba-MPSK-Passphrase = ${psk}
    `)
}

export function makeAuthorizedMpsks(mpsks: ReadonlyMap<Name, CallingStationIdAuthentication>): string {
    return F.pipe(
        mpsks,
        RM.map((auth) => makeAuthorizedMpsk(auth.callingStationId, auth.psk)),
        (kv) => Array.from(kv.values()).join("\n"),
    )
}

export async function generateAuthorizedMpsksFile(
    mpsks: ReadonlyMap<Name, CallingStationIdAuthentication>,
    outputPath: string,
): Promise<void> {
    const output = makeAuthorizedMpsks(mpsks)
    await writeFile(outputPath, output, { encoding: "utf-8" })
    logger.info(`Written authorized_mpsks to ${outputPath}`)
}
