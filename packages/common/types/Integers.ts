import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

export const PositiveIntegerFromString = new t.Type<number, string, unknown>(
    "PositiveIntegerFromString",
    (u): u is number => E.isRight(PositiveIntegerFromString.validate(u, [])),
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.flatMap((s) => (/^\d+$/.test(s) ? t.success(parseInt(s, 10)) : t.failure(u, c))),
        ),
    (n) => n.toString(),
)

export const IntegerRangeType = (min: number, max: number) =>
    new t.Type<number, number, unknown>(
        "IntegerRange",
        (u): u is number => E.isRight(IntegerRangeType(min, max).validate(u, [])),
        (u, c) =>
            F.pipe(
                t.number.validate(u, c),
                E.flatMap((n) =>
                    n >= min && n <= max
                        ? t.success(n)
                        : t.failure(u, c, `Value is out of range: ${n} (min: ${min}, max: ${max})`),
                ),
            ),
        F.identity,
    )
