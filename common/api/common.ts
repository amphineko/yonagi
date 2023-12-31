import * as t from "io-ts/lib/index"

import { MapType } from "../common"

export function MapFromRecordType<KT extends t.Type<string>, VT extends t.Mixed>(
    key: KT,
    value: VT,
): t.Type<ReadonlyMap<t.TypeOf<KT>, t.TypeOf<VT>>, Record<t.OutputOf<KT>, t.OutputOf<VT>>> {
    const base = MapType(key, value)
    return new t.Type(
        "MapFromRecord",
        base.is,
        (u, c) => {
            if (typeof u !== "object" || u === null) {
                return t.failure(u, c, "Input is not a record")
            }

            return base.validate(new Map(Object.entries(u)), c)
        },
        (a) => Object.fromEntries(base.encode(a)) as Record<t.OutputOf<KT>, t.OutputOf<VT>>,
    )
}

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
