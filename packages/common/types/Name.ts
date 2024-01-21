import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

import { StringWithLengthRangeType } from "./StringWithLengthRange"

export type Name = t.Branded<string, "Name">

const NameLengthType = StringWithLengthRangeType(32, 1)

export const NameType = new t.Type<Name, string, unknown>(
    "Name",
    (u): u is Name => E.isRight(NameType.validate(u, [])),
    (u, c) =>
        F.pipe(
            NameLengthType.validate(u, c),
            E.flatMap((s) =>
                /^[a-zA-Z0-9_-]+$/.test(s)
                    ? t.success(s as Name)
                    : t.failure(u, c, "Input contains invalid characters"),
            ),
        ),
    (a) => a,
)
