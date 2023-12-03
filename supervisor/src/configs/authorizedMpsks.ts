import { writeFile } from "fs/promises"
import { basename } from "path"

import { CallingStationIdAuthentication } from "@yonagi/common/mpsks"
import { pino } from "pino"

import { dedent } from "./indents"

const logger = pino({ name: `${basename(__dirname)}/${basename(__filename)}` })

export function makeAuthorizedMpsk(
    callingStationId: string,
    psk: string,
    vlanId: number = 0,
    vlanAttribute: string = "Tunnel-Private-Group-Id",
    tunnelType: string = "VLAN",
    tunnelMediumType: string = "IEEE-802",
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

export function makeAuthorizedMpsks(mpsk: CallingStationIdAuthentication[]): string {
    return mpsk.map(({ callingStationId, psk }) => makeAuthorizedMpsk(callingStationId, psk)).join("\n")
}

export async function generateAuthorizedMpsksFile(
    mpsks: CallingStationIdAuthentication[],
    outputPath: string,
): Promise<void> {
    const output = makeAuthorizedMpsks(mpsks)
    await writeFile(outputPath, output, { encoding: "utf-8" })
    logger.info(`Written authorized_mpsks to ${outputPath}`)
}
