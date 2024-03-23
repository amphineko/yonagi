import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"

const MAX_USERNAME_LENGTH = 64

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/

function isUsername(u: string): boolean {
    return u.length > 0 && u.length <= MAX_USERNAME_LENGTH && USERNAME_REGEX.test(u)
}

export type Username = t.Branded<string, { readonly Username: unique symbol }>

export const UsernameType = new t.Type<Username, string, unknown>(
    "Username",
    (u): u is Username => typeof u === "string" && isUsername(u),
    (u, c) =>
        F.pipe(
            t.string.validate(u, c),
            E.chain((u) => (isUsername(u) ? t.success(u as Username) : t.failure(u, c))),
        ),
    t.identity,
)
