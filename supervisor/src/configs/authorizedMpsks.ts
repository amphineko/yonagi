import { writeFile } from "fs/promises"
import path from "path"

import * as RM from "fp-ts/lib/ReadonlyMap"
import * as F from "fp-ts/lib/function"

import { RaddbGenParams } from "."
import { dedent } from "./indents"

export function makeAuthorizedMpsk(
    callingStationId: string,
    psk: string,
    vlanId = 0,
    vlanAttribute = "Tunnel-Private-Group-Id",
    tunnelType = "VLAN",
    tunnelMediumType = "IEEE-802",
): string {
    return dedent(`
        ${callingStationId.toUpperCase()}
            Tunnel-Medium-Type = ${tunnelMediumType},
            ${vlanAttribute} = ${vlanId},
            Tunnel-Type = ${tunnelType},
            Aruba-MPSK-Passphrase = ${psk}
    `)
}

export async function generateAuthorizedMpsksFile({ mpsks, raddbPath }: RaddbGenParams): Promise<void> {
    const filename = path.join(raddbPath, "authorized_mpsks")
    await F.pipe(
        mpsks,
        RM.map((auth) => makeAuthorizedMpsk(auth.callingStationId, auth.psk)),
        (kv) => Array.from(kv.values()).join("\n"),
        (content) => writeFile(filename, content, { encoding: "utf-8" }),
    )
}
