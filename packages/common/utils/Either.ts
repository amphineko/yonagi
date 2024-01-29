import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"

export function mapValidationLeftError<E extends t.Errors, G extends Error = Error>(
    f: (error: string) => G,
): <A>(fa: E.Either<E, A>) => E.Either<G, A> {
    return E.mapLeft(F.flow(PR.failure, (errors) => errors.join(", "), f))
}
