import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

export const PositiveIntegerFromString = new t.Type<number, string, unknown>(
    "PositiveIntegerFromString",
    (u): u is number => typeof u === "number",
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.flatMap((s) => (/^\d+$/.test(s) ? t.success(parseInt(s, 10)) : t.failure(u, c))),
        ),
    (n) => n.toString(),
)
