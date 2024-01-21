import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import * as PR from "io-ts/lib/PathReporter"

export function uploadAndDecodeJsonFile<T>(decoder: t.Decoder<unknown, T>): TE.TaskEither<Error, T> {
    return F.pipe(
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
        TE.flatMap((file) => TE.tryCatch(async () => JSON.parse(await file.text()) as unknown, E.toError)),
        TE.flatMap(
            F.flow(
                (u) => decoder.decode(u),
                E.mapLeft((errors) => new Error(PR.failure(errors).join("\n"))),
                TE.fromEither,
            ),
        ),
    )
}
