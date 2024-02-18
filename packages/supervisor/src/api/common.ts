import { BadRequestException, InternalServerErrorException } from "@nestjs/common"
import { mapValidationLeftError } from "@yonagi/common/utils/Either"
import * as E from "fp-ts/lib/Either"
import * as Task from "fp-ts/lib/Task"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"

export function validateRequestParam<A>(u: unknown, decoder: t.Decoder<unknown, A>): E.Either<Error, A> {
    return F.pipe(
        decoder.decode(u),
        mapValidationLeftError((message) => new BadRequestException(message)),
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

export function resolveOrThrow(): <T>(task: TE.TaskEither<Error, T>) => Task.Task<T> {
    return TE.getOrElse((error) => {
        throw error
    })
}
