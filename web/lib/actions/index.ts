import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import { PathReporter } from "io-ts/lib/PathReporter"

export function dataFromResponse<T extends t.Mixed, A = t.TypeOf<T>>(dataType: T): (i: unknown) => t.Validation<A> {
    const responseType = t.type({
        statusCode: t.literal(200),
        data: dataType,
    })

    return (response: unknown): t.Validation<A> => {
        return F.pipe(
            responseType.decode(response),
            E.flatMap((response) => t.success(response.data)),
        )
    }
}

export function getAll<T extends t.Mixed>(url: string, dataType: T): Promise<t.TypeOf<T>> {
    return F.pipe(
        TE.tryCatch(() => fetch(`http://localhost:8000/${url}`, { cache: "no-cache" }), E.toError),
        TE.flatMap((response) => TE.tryCatch(() => response.json(), E.toError)),
        TE.flatMapEither(
            F.flow(
                dataFromResponse(dataType),
                E.mapLeft((errors) => new Error(PathReporter.report(E.left(errors)).join("\n"))),
            ),
        ),
        TE.getOrElse((error) => {
            throw error
        }),
    )()
}
