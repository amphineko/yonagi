import * as E from "fp-ts/Either"
import * as F from "fp-ts/function"
import * as t from "io-ts"

interface EncodedAttribute<T> {
    type: string
    value: [T]
}

export function attribute<A, O>(name: string, type: string, valueType: t.Type<A, O>): t.Type<A, EncodedAttribute<O>> {
    const container = t.type({
        type: t.literal(type),
        value: t.readonlyArray(valueType),
    })

    return new t.Type<A, EncodedAttribute<O>>(
        `attribute:${name}`,
        (u): u is A => valueType.is(u),
        (u, c) =>
            F.pipe(
                container.validate(u, c),
                E.flatMap(
                    F.flow(
                        E.fromPredicate(
                            ({ value }) => value.length === 1,
                            () => `Expected exactly one value`,
                        ),
                        E.orElse((error) => t.failure(u, c, error)),
                    ),
                ),
                E.map(({ value }) => value[0]),
            ),
        (a): EncodedAttribute<O> => {
            const encoded = valueType.encode(a)
            return {
                type,
                value: [encoded],
            } satisfies EncodedAttribute<O>
        },
    )
}
