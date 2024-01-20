import * as E from "fp-ts/lib/Either"
import * as t from "io-ts/lib/index"

export type NetMask = t.Branded<number, "NetMask">

export const NetMaskType = new t.Type<NetMask, number, unknown>(
    "NetMask",
    (u): u is NetMask => E.isRight(NetMaskType.validate(u, [])),
    (u, c) => {
        const n = Number(u)
        return Number.isInteger(n) && n >= 0 && n <= 32 ? t.success(n as NetMask) : t.failure(u, c)
    },
    (a) => a,
)
