import * as Task from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"

export function resolveOrThrow(): <A, E extends Error = Error>(TE: TE.TaskEither<E, A>) => Task.Task<A> {
    return TE.getOrElse((e: Error) => {
        throw e
    })
}
