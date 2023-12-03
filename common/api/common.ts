import * as t from "io-ts/lib/index"

export const ResponseCodec = <C extends t.Mixed | t.UndefinedType>(codec: C) =>
    t.union([
        t.type({
            data: t.undefined,
            message: t.string,
            statusCode: t.number,
        }),
        t.type({
            data: codec,
            message: t.string,
            statusCode: t.number,
        }),
    ])

export type ResponseOf<C extends t.Mixed | t.UndefinedType> = t.TypeOf<ReturnType<typeof ResponseCodec<t.Type<C>>>>

export function foldResponse<T extends t.Mixed | t.UndefinedType>(
    onLeft: (message: string, statusCode: number) => void,
    onRight: (data: T | undefined, message: string, statusCode: number) => void,
): (response: ResponseOf<T>) => void {
    return (response) => {
        if (response.statusCode != 200) {
            onLeft(response.message, response.statusCode)
        } else {
            onRight(response.data, response.message, response.statusCode)
        }
    }
}
