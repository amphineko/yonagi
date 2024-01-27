"use client"

import { Download, Upload } from "@mui/icons-material"
import { Button } from "@mui/material"
import { resolveOrThrow } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"
import { useCallback } from "react"

export function ExportButton<A, O>({
    data,
    encoder,
    filename,
}: {
    data: A
    encoder: t.Encoder<A, O>
    filename: string
}) {
    const onClick = useCallback(() => {
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
    }, [data, encoder, filename])

    return (
        <Button aria-label="Export" startIcon={<Download />} onClick={onClick}>
            Export
        </Button>
    )
}

export function ImportButton<A>({
    decoder,
    onImport,
}: {
    decoder: t.Decoder<unknown, A>
    onImport: (data: A) => void
}) {
    const onClick = useCallback(() => {
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
            TE.map(onImport),
            resolveOrThrow(),
        )().catch((e) => {
            console.error(e)
            alert(e)
        })
    }, [decoder, onImport])

    return (
        <Button aria-label="Import" startIcon={<Upload />} onClick={onClick}>
            Import
        </Button>
    )
}
