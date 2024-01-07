import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"

export function deleteEndpoint<T extends string>(endpoint: T): Promise<void> {
    return requestTypedEndpoint({
        endpoint,
        method: "DELETE",
    })
}

export async function getTypedEndpoint<A>(responseDataType: t.Decoder<unknown, A>, endpoint: string): Promise<A> {
    return await requestTypedEndpoint({
        endpoint,
        method: "GET",
        responseDataType,
    })
}

export async function postTypedEndpoint<A, B>(
    responseDataType: t.Decoder<unknown, A>,
    requestBodyType: t.Encoder<B, unknown>,
    endpoint: string,
    body: B,
): Promise<A> {
    return await requestTypedEndpoint({
        body,
        endpoint,
        method: "POST",
        requestBodyType,
        responseDataType,
    })
}

async function requestTypedEndpoint<A, B>({
    body,
    endpoint,
    method,
    requestBodyType,
    responseDataType,
}: {
    body?: B
    endpoint: string
    method: "GET" | "POST" | "DELETE"
    requestBodyType?: t.Encoder<B, unknown>
    responseDataType?: t.Decoder<unknown, A>
}): Promise<A> {
    const requestInit: RequestInit = {
        cache: "no-cache",
        method,
    }
    if (body !== undefined && requestBodyType !== undefined) {
        requestInit.body = JSON.stringify(requestBodyType.encode(body))
        requestInit.headers = {
            "Content-Type": "application/json",
        }
    } else if ((body !== undefined) !== (requestBodyType !== undefined)) {
        throw new Error("body and requestBodyType must be both defined")
    }

    const responseType = t.type({
        data: (responseDataType ?? t.any) as t.Type<A>,
        statusCode: t.literal(200),
    })
    const errorType = t.type({
        statusCode: t.number,
        message: t.string,
    })

    return await F.pipe(
        TE.Do,
        TE.bind("response", () =>
            TE.tryCatch(() => fetch(`http://localhost:8000/${endpoint}`, requestInit), E.toError),
        ),
        TE.bind("json", ({ response }) => TE.tryCatch(() => response.json(), E.toError)),
        TE.flatMap(({ response, json }) =>
            response.ok
                ? TE.right(json)
                : TE.fromEither(
                      F.pipe(
                          errorType.decode(json),
                          E.fold(
                              (left) => E.left(new Error("Cannot decode error: " + PR.failure(left).join("\n"))),
                              (right) => E.left(new Error(right.message)),
                          ),
                      ),
                  ),
        ),
        TE.flatMapEither(
            F.flow(
                (response) => responseType.decode(response),
                E.mapLeft((left) => new Error("Cannot decode response: " + PR.failure(left).join("\n"))),
            ),
        ),
        TE.map((response) => response.data),
        TE.getOrElse((error) => {
            throw error
        }),
    )()
}
