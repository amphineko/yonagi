import { readFile, writeFile } from "fs/promises"

import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as t from "io-ts"
import { PathReporter } from "io-ts/lib/PathReporter"

export class FileBasedStorage<T> {
    constructor(
        private jsonFilePath: string,
        private codec: t.Type<T>,
    ) {}

    protected async load(): Promise<T> {
        return F.pipe(
            // read from file
            await readFile(this.jsonFilePath, { encoding: "utf-8" }),
            // parse JSON
            JSON.parse,
            // validate JSON
            (obj) => this.codec.decode(obj),
            // return the struct or throw error
            E.fold(
                (error) => {
                    throw new Error(PathReporter.report(E.left(error)).join("\n"))
                },
                (x) => x,
            ),
        )
    }

    protected async save(data: T): Promise<void> {
        await writeFile(this.jsonFilePath, JSON.stringify(data))
    }
}
