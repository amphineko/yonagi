import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

import { StringWithLengthRangeType } from "./StringWithLengthRange"

export type Secret = t.Branded<string, "Secret">

const SecretLengthType = StringWithLengthRangeType(64)

export const SecretType = new t.Type<Secret, string, unknown>(
    "Secret",
    (u): u is Secret => E.isRight(SecretType.validate(u, [])),
    (u, c) =>
        F.pipe(
            SecretLengthType.validate(u, c),
            E.flatMap((s) =>
                /^[a-zA-Z0-9]+$/.test(s) ? t.success(s as Secret) : t.failure(u, c, "Input is not a valid secret"),
            ),
        ),
    (a) => a,
)
