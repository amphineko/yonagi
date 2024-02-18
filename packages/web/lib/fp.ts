import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"

export function mapLeftValidationError<E extends Error, A>(
    f: (message: string) => E,
): (e: t.Validation<A>) => E.Either<E, A> {
    return E.mapLeft(F.flow(PR.failure, (errors) => errors.join(", "), f))
}
