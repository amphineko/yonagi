import * as A from "fp-ts/lib/Array"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

export function MapType<
    KT extends t.Type<string>,
    VT extends t.Mixed,
    A extends ReadonlyMap<t.TypeOf<KT>, t.TypeOf<VT>>,
>(key: KT, value: VT, name = `Map<${key.name}, ${value.name}>`): t.Type<A, Map<t.OutputOf<KT>, t.OutputOf<VT>>> {
    return new t.Type(
        name,
        (u): u is A => u instanceof Map && Array.from(u.entries()).every(([k, v]) => key.is(k) && value.is(v)),
        (u, c) => {
            if (!(u instanceof Map)) {
                return t.failure(u, c, "Input is not a Map")
            }

            const tupleType = t.tuple([key, value])
            return F.pipe(
                Array.from(u.entries()),
                A.traverse(E.Applicative)((u) => tupleType.validate(u, c)),
                E.map((u) => new Map(u)),
            ) as t.Validation<A>
        },
        (a) =>
            F.pipe(
                Array.from(a.entries()),
                A.map(([k, v]) => [key.encode(k), value.encode(v)] as [t.OutputOf<KT>, t.OutputOf<VT>]),
                (a) => new Map(a),
            ),
    )
}

export type TypedMap<KT extends t.Type<string>, VT extends t.Mixed> = ReadonlyMap<t.TypeOf<KT>, t.TypeOf<VT>>
