import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"

export function deleteEndpoint<T extends string>(url: T): Promise<void> {
    return F.pipe(
        TE.tryCatch(() => fetch(`http://localhost:8000/${url}`, { method: "DELETE", cache: "no-cache" }), E.toError),
        TE.filterOrElse(
            (response) => response.status === 200,
            (response) => new Error(`Unexpected status code: ${response.status}`),
        ),
        TE.map(() => undefined),
        TE.getOrElse((error) => {
            throw error
        }),
    )()
}

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

export async function postTypedEndpoint<I, R>(
    input: I,
    endpoint: string,
    inputType: t.Encoder<I, unknown>,
    outputType: t.Type<R>,
): Promise<R> {
    const responseType = t.type({ statusCode: t.literal(200), data: outputType })
    const errorType = t.type({ statusCode: t.number, message: t.string })
    return await F.pipe(
        TE.Do,
        TE.bind("response", () =>
            TE.tryCatch(
                () =>
                    fetch(`http://localhost:8000/${endpoint}`, {
                        method: "POST",
                        cache: "no-cache",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(inputType.encode(input)),
                    }),
                E.toError,
            ),
        ),
        TE.bind("json", ({ response }) => TE.tryCatch(() => response.json(), E.toError)),
        TE.flatMap(({ response, json }) =>
            response.ok
                ? TE.right(json)
                : TE.fromEither(
                      F.pipe(
                          errorType.decode(json),
                          E.fold(
                              (left) => E.left(new Error(PR.failure(left).join("\n"))),
                              (right) => E.left(new Error(right.message)),
                          ),
                      ),
                  ),
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
