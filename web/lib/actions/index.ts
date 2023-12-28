import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"

export function getTypedEndpoint<A, O>(dataType: t.Type<A, O>, url: string): Promise<A> {
    const responseType = t.type({
        statusCode: t.literal(200),
        data: dataType,
    })

    return F.pipe(
        TE.tryCatch(
            () => fetch(`http://localhost:8000/${url}`, { cache: "no-cache" }).then((response) => response.json()),
            E.toError,
        ),
        TE.flatMapEither(
            F.flow(
                (response) => responseType.decode(response),
                E.mapLeft((left) => new Error(PR.failure(left).join("\n"))),
            ),
        ),
        TE.map((response) => response.data),
        TE.getOrElse((error) => {
            throw error
        }),
    )()
}
