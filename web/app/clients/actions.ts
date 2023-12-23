"use server"

import { ListClientsResponseType } from "@yonagi/common/api/clients"
import { Client } from "@yonagi/common/clients"
import { Name } from "@yonagi/common/common"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import { PathReporter } from "io-ts/lib/PathReporter"

function dataFromResponse<T extends t.Mixed, A = t.TypeOf<T>>(dataType: T) {
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

export async function createOrUpdateByName(name: string, client: Client): Promise<void> {
    await fetch(`http://localhost:8000/api/v1/clients/${name}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(client),
    })
}

export async function deleteByName(name: string): Promise<void> {
    await fetch(`http://localhost:8000/api/v1/clients/${name}`, {
        method: "DELETE",
    })
}

export async function getAllClients(): Promise<ReadonlyMap<Name, Client>> {
    return await F.pipe(
        TE.tryCatch(() => fetch("http://localhost:8000/api/v1/clients", { cache: "no-cache" }), E.toError),
        TE.flatMap((response) => TE.tryCatch(() => response.json(), E.toError)),
        TE.flatMapEither(
            F.flow(
                dataFromResponse(ListClientsResponseType),
                E.mapLeft((errors) => new Error(PathReporter.report(E.left(errors)).join("\n"))),
            ),
        ),
        TE.getOrElse((error) => {
            throw error
        }),
    )()
}
