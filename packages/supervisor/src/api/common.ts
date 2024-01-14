import { BadRequestException, InternalServerErrorException } from "@nestjs/common"
import { Name, NameType } from "@yonagi/common/common"
import * as E from "fp-ts/lib/Either"
import * as Task from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"

function mapLeftDecodeError<O extends Error, A>(f: (message: string) => O): (e: t.Validation<A>) => E.Either<O, A> {
    return E.mapLeft(F.flow(PR.failure, (errors) => errors.join(", "), f))
}

function sanitizeName(name: string): string {
    return F.pipe(
        NameType.decode(name),
        mapLeftDecodeError((message) => new BadRequestException("Malformed name: " + message)),
        E.getOrElse<Error, Name>((error) => {
            throw error
        }),
    )
}

export function createOrUpdate<P extends t.Props, T = t.TypeC<P>, PT = t.PartialC<P>>(
    unsanitizedName: string,
    body: unknown,
    createRequestType: t.Decoder<unknown, T>,
    updateRequestType: t.Decoder<unknown, PT>,
    get: (name: Name) => Promise<T | null>,
    set: (name: Name, value: T) => Promise<void>,
): Task.Task<void> {
    const name: Name = sanitizeName(unsanitizedName)

    return F.pipe(
        TE.tryCatch(
            () => get(name),
            (reason) => new InternalServerErrorException(reason),
        ),

        TE.flatMap(
            F.flow(
                E.fromNullable(null),
                E.fold(
                    () =>
                        F.pipe(
                            createRequestType.decode(body),
                            mapLeftDecodeError((message) => new BadRequestException(message)),
                        ),
                    (current) =>
                        F.pipe(
                            updateRequestType.decode(body),
                            mapLeftDecodeError((message) => new BadRequestException(message)),
                            E.map((update) => {
                                Object.assign(current, update)
                                return current
                            }),
                        ),
                ),
                TE.fromEither,
            ),
        ),

        TE.flatMap((value) =>
            TE.tryCatch(
                () => set(name, value),
                (reason) => new InternalServerErrorException(reason),
            ),
        ),

        TE.fold(
            (error) => {
                throw error
            },
            () => Task.of(undefined),
        ),
    )
}

export function EncodeResponseWith<A, O>(codec: t.Type<A, O>): MethodDecorator {
    // apply encoder.encode to the return value of the decorated method
    return (target, propertyKey, descriptor: PropertyDescriptor) => {
        const original = descriptor.value as unknown as (...args: unknown[]) => Promise<unknown>
        descriptor.value = async function (...args: unknown[]): Promise<O> {
            const result = await original.apply(this, args)
            if (!codec.is(result)) {
                throw new InternalServerErrorException("Invalid response supplied to encoder")
            }
            return codec.encode(result)
        }
    }
}
