import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

export type PSK = t.Branded<string, "PSK">

export const PSKType = new t.Type<PSK, string, unknown>(
    "PSK",
    (u): u is PSK => E.isRight(PSKType.validate(u, [])),
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.flatMap((s) =>
                /^[a-zA-Z0-9_-]+$/.test(s) ? t.success(s as PSK) : t.failure(u, c, "Input is not a valid PSK"),
            ),
        ),
    (a) => a,
)
