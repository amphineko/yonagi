import { Inject, Injectable, forwardRef } from "@nestjs/common"
import { CallingStationId } from "@yonagi/common/types/CallingStationId"
import { CallingStationIdAuthentication, MPSKType } from "@yonagi/common/types/MPSK"
import { Name } from "@yonagi/common/types/Name"
import { mapValidationLeftError } from "@yonagi/common/utils/Either"
import { getOrThrow } from "@yonagi/common/utils/TaskEither"
import * as A from "fp-ts/lib/Array"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import { BaseEntity, Column, DataSource, Entity, EntityManager, In, PrimaryGeneratedColumn, Repository } from "typeorm"

import { AbstractMPSKStorage } from ".."

@Entity("mpsks")
export class SqlMPSKEntity extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id!: string

    @Column({ nullable: false, unique: true })
    public name!: string

    @Column({ nullable: false })
    public callingStationId!: string

    @Column({ nullable: false })
    public psk!: string
}

@Injectable()
export class SqlMPSKStorage extends AbstractMPSKStorage {
    private readonly manager: EntityManager

    private readonly repository: Repository<SqlMPSKEntity>

    constructor(@Inject(forwardRef(() => DataSource)) { manager }: DataSource) {
        super()
        this.manager = manager
        this.repository = manager.getRepository(SqlMPSKEntity)
    }

    async all(): Promise<readonly CallingStationIdAuthentication[]> {
        return await F.pipe(
            TE.tryCatch(async () => await this.repository.find(), E.toError),
            TE.flatMapEither(
                F.flow(
                    A.map((entity) => MPSKType.decode(entity)),
                    A.sequence(E.Applicative),
                    mapValidationLeftError((error) => new Error(error)),
                ),
            ),
            getOrThrow(),
        )()
    }

    async bulkCreateOrUpdate(values: readonly CallingStationIdAuthentication[]): Promise<void> {
        await this.manager.transaction(async (manager) => {
            const names = values.map((value) => value.name)
            const entities = await manager.findBy(SqlMPSKEntity, { name: In(names) })
            for (const value of values) {
                const entity = entities.find((entity) => entity.name === value.name) ?? manager.create(SqlMPSKEntity)
                entity.name = value.name
                entity.callingStationId = value.callingStationId
                entity.psk = value.psk
                await manager.save(entity)
            }
        })
    }

    async createOrUpdateByName(name: Name, value: CallingStationIdAuthentication): Promise<void> {
        await this.manager.transaction(async (manager) => {
            await manager
                .findOneBy(SqlMPSKEntity, { name })
                .then((entity) => entity ?? manager.create(SqlMPSKEntity))
                .then((entity) => {
                    entity.name = name
                    entity.callingStationId = value.callingStationId
                    entity.psk = value.psk
                    return manager.save(entity)
                })
        })
    }

    async deleteByName(name: Name): Promise<boolean> {
        return await F.pipe(
            TE.tryCatch(async () => await this.repository.delete({ name }), E.toError),
            TE.filterOrElse(
                ({ affected }) => typeof affected === "number",
                () => new Error("Underlying database driver does not support affected rows"),
            ),
            TE.map(({ affected }) => affected === 1),
            getOrThrow(),
        )()
    }

    async getByCallingStationId(callingStationId: CallingStationId): Promise<CallingStationIdAuthentication | null> {
        return await F.pipe(
            TE.tryCatch(async () => await this.repository.findBy({ callingStationId }), E.toError),
            TE.filterOrElse(
                (entities) => entities.length > 1,
                () => new Error("Unexpected multiple MPSKs with the same Calling-Station-Id"),
            ),
            TE.flatMapEither((entities) =>
                entities.length !== 0
                    ? F.pipe(
                          MPSKType.decode(entities[0]),
                          E.mapLeft((errors) => new Error(PR.failure(errors).join("\n"))),
                      )
                    : E.right(null),
            ),
            getOrThrow(),
        )()
    }

    async getByName(name: Name): Promise<CallingStationIdAuthentication | null> {
        return await F.pipe(
            TE.tryCatch(async () => await this.repository.findOneBy({ name }), E.toError),
            TE.flatMap((entity) =>
                entity
                    ? TE.fromEither(
                          F.pipe(
                              MPSKType.decode(entity),
                              mapValidationLeftError((error) => new Error(error)),
                          ),
                      )
                    : TE.right(null),
            ),
            getOrThrow(),
        )()
    }
}
