import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

export const StringWithMinimumLengthType = (minLength: number) =>
    new t.Type<string, string, unknown>(
        "StringWithMinimumLength",
        (u): u is string => E.isRight(StringWithMinimumLengthType(minLength).validate(u, [])),
        (u, c) =>
            F.pipe(
                t.string.validate(u, c),
                E.flatMap((s) =>
                    s.length >= minLength
                        ? t.success(s)
                        : t.failure(u, c, `Input length ${s.length} is less than minimum length ${minLength}`),
                ),
            ),
        (a) => a,
    )

export const StringWithMaximumLengthType = (maxLength: number) =>
    new t.Type<string, string, unknown>(
        "StringWithMaximumLength",
        (u): u is string => E.isRight(StringWithMaximumLengthType(maxLength).validate(u, [])),
        (u, c) =>
            F.pipe(
                t.string.validate(u, c),
                E.flatMap((s) =>
                    s.length <= maxLength
                        ? t.success(s)
                        : t.failure(u, c, `Input length ${s.length} is greater than maximum length ${maxLength}`),
                ),
            ),
        (a) => a,
    )

export const StringWithLengthRangeType = (maxLength: number, minLength = 0) =>
    new t.Type<string, string, unknown>(
        "StringWithLengthRange",
        (u): u is string => E.isRight(StringWithLengthRangeType(maxLength, minLength).validate(u, [])),
        (u, c) =>
            F.pipe(
                E.right(u),
                E.flatMap((s) => StringWithMinimumLengthType(minLength).validate(s, c)),
                E.flatMap((s) => StringWithMaximumLengthType(maxLength).validate(s, c)),
            ),
        (a) => a,
    )

export const NonEmptyStringType = StringWithMinimumLengthType(1)

export type NonEmptyString = t.TypeOf<typeof NonEmptyStringType>
