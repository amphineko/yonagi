import * as Task from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"

export function tryCatchF<A, B, E2>(
    f: (a: A) => Promise<B>,
    onRejected: (reason: unknown) => E2,
): <E1>(ma: TE.TaskEither<E1, A>) => TE.TaskEither<E1 | E2, B> {
    return TE.flatMap((a) => TE.tryCatch<E2, B>(() => f(a), onRejected))
}

export function getOrThrow(): <A, E extends Error = Error>(TE: TE.TaskEither<E, A>) => Task.Task<A> {
    return TE.getOrElse((e: Error) => {
        throw e
    })
}
