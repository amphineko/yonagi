import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

export const DateFromUnixTimestamp = new t.Type<Date, number, unknown>(
    "DateFromUnixTimestamp",
    (u): u is Date => u instanceof Date,
    (u, c) =>
        F.pipe(
            t.number.validate(u, c),
            E.map((n) => new Date(n * 1000)),
        ),
    (d) => Math.floor(d.getTime() / 1000),
)
