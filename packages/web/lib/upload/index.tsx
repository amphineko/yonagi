"use client"

import { getOrThrow } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"
import { useCallback } from "react"

export function useExportDownload<A, O>(filename: string, encoder: t.Encoder<A, O>) {
    const download = useCallback(
        (data: A) => {
            F.pipe(
                encoder.encode(data),
                (encoded) => JSON.stringify(encoded),
                (json) => {
                    const a = document.createElement("a")
                    a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }))
                    a.download = filename
                    a.click()
                    URL.revokeObjectURL(a.href)
                },
            )
        },
        [encoder, filename],
    )

    return { download }
}

export function useImportUpload<A>(
    decoder: t.Decoder<unknown, A>,
    onImport: (data: A) => void,
    onError: (error: Error) => void,
) {
    const upload = useCallback(() => {
        F.pipe(
            // upload file
            TE.tryCatch(() => {
                const input = document.createElement("input")
                input.accept = "application/json"
                input.type = "file"
                input.click()
                return new Promise<File>((resolve, reject) => {
                    input.onchange = (event) => {
                        const file = (event.target as HTMLInputElement).files?.[0]
                        if (file) {
                            resolve(file)
                        } else {
                            reject(new Error("No file selected"))
                        }
                    }
                })
            }, E.toError),

            // read and parse json
            TE.flatMap((file) => TE.tryCatch(async () => JSON.parse(await file.text()) as unknown, E.toError)),

            // decode
            TE.flatMap(
                F.flow(
                    (u) => decoder.decode(u),
                    E.mapLeft((errors) => new Error(PR.failure(errors).join("\n"))),
                    TE.fromEither,
                ),
            ),
            getOrThrow(),
        )()
            .then(onImport)
            .catch(onError)
    }, [decoder, onError, onImport])

    return { upload }
}
