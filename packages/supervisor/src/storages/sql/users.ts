import { Inject, Injectable } from "@nestjs/common"
import { RadiusUser, RadiusUserPasswordStatus, RadiusUserPasswords } from "@yonagi/common/types/users/RadiusUser"
import { Username, UsernameType } from "@yonagi/common/types/users/Username"
import { mapValidationLeftError } from "@yonagi/common/utils/Either"
import { getOrThrow } from "@yonagi/common/utils/TaskEither"
import * as A from "fp-ts/lib/Array"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts"
import { BaseEntity, Column, DataSource, Entity, EntityManager, PrimaryGeneratedColumn, Repository } from "typeorm"

import { AbstractRadiusUserPasswordStorage, AbstractRadiusUserStorage } from ".."

/**
 * TODO(amphineko): in the future when user records are implemented,
 *  passwords should be deleted before users,
 *  and password records should have a foreign key to user records.
 */
@Entity("user_passwords")
export class RadiusUserPasswordEntity extends BaseEntity {
    @PrimaryGeneratedColumn("increment")
    public id!: number

    @Column({ name: "username", nullable: false })
    public username!: string

    @Column({ name: "cleartext", nullable: true, default: null, type: "varchar", length: 32 })
    public clearText!: string | null

    @Column({ name: "nthash", nullable: true, default: null, type: "varchar", length: 32 })
    public ntHash!: string | null

    @Column({ name: "ssha512", nullable: true, default: null, type: "varchar", length: 192 })
    public ssha512!: string | null

    constructor(username?: string) {
        super()
        if (username) {
            this.username = username
        }
    }
}

@Injectable()
export class SqlRadiusUserStorage extends AbstractRadiusUserStorage {
    async all(): Promise<readonly RadiusUser[]> {
        return await F.pipe(
            TE.tryCatch(() => this.repository.find({ select: ["username"] }), E.toError),
            TE.flatMapEither(
                F.flow(
                    A.map(({ username }) => UsernameType.decode(username)),
                    A.map(E.map((username): RadiusUser => ({ username }))),
                    A.sequence(E.Applicative),
                    mapValidationLeftError((error) => new Error(error)),
                ),
            ),
            getOrThrow(),
        )()
    }

    async createOrUpdate(username: Username, record: Partial<RadiusUser>): Promise<void> {
        if (username !== record.username) {
            throw new Error("Username doesn't match")
        }

        await this.passwordStorage.createOrUpdate(username, { username })
    }

    async deleteByUsername(username: Username): Promise<boolean> {
        return await this.passwordStorage.deleteByUsername(username)
    }

    private readonly repository: Repository<RadiusUserPasswordEntity>

    constructor(
        @Inject(DataSource) dataSource: DataSource,
        @Inject(AbstractRadiusUserPasswordStorage) private readonly passwordStorage: AbstractRadiusUserPasswordStorage,
    ) {
        super()
        this.repository = dataSource.manager.getRepository(RadiusUserPasswordEntity)
    }
}

const BooleanFromSql = new t.Type<boolean, unknown, unknown>(
    "SqliteBoolean",
    (u): u is boolean => typeof u === "boolean",
    (u, c) => {
        if (u === 0 || u === "0") return t.success(false)
        if (u === 1 || u === "1") return t.success(true)
        return t.failure(u, c, "expected 0 or 1")
    },
    (a) => (a ? 1 : 0),
)

const RadiusUserPasswordStatusFromSqlType: t.Type<RadiusUserPasswordStatus, unknown> = t.type({
    username: UsernameType,
    clearText: BooleanFromSql,
    ntHash: BooleanFromSql,
    ssha512: BooleanFromSql,
})

@Injectable()
export class SqlRadiusUserPasswordStorage extends AbstractRadiusUserPasswordStorage {
    async allStatus(): Promise<readonly RadiusUserPasswordStatus[]> {
        return await F.pipe(
            TE.tryCatch(
                () =>
                    // NOTE(amphineko): alias of each column should match the key of RadiusUserPasswordStatus
                    this.repository
                        .createQueryBuilder("password")
                        .select("password.username", "username")
                        .addSelect("password.cleartext IS NOT NULL", "clearText")
                        .addSelect("password.nthash IS NOT NULL", "ntHash")
                        .addSelect("password.ssha512 IS NOT NULL", "ssha512")
                        .getRawMany(),
                E.toError,
            ),
            TE.flatMapEither(
                F.flow(
                    A.map((row) => RadiusUserPasswordStatusFromSqlType.decode(row)),
                    A.sequence(E.Applicative),
                    mapValidationLeftError((error) => new Error(error)),
                ),
            ),
            getOrThrow(),
        )()
    }

    /**
     *  For each password attribute,
     *      string = password hash for this method
     *      null = method is disabled
     *      undefined = no change
     */
    async createOrUpdate(username: Username, record: Partial<RadiusUserPasswords>): Promise<void> {
        if (username !== record.username) {
            throw new Error("Username doesn't match")
        }

        await this.manager.transaction(async (manager) => {
            await manager
                .findOneBy(RadiusUserPasswordEntity, { username })
                .then((entity) => entity ?? new RadiusUserPasswordEntity(username))
                .then((entity) => {
                    if (record.clearText !== undefined) entity.clearText = record.clearText
                    if (record.ntHash !== undefined) entity.ntHash = record.ntHash
                    if (record.ssha512 !== undefined) entity.ssha512 = record.ssha512
                    return manager.save(entity)
                })
        })
    }

    async deleteByUsername(username: Username): Promise<boolean> {
        const { affected } = await this.manager.delete(RadiusUserPasswordEntity, { username })
        if (typeof affected !== "number") {
            throw new Error("Driver doesn't support affected rows")
        }
        return affected > 0
    }

    async getByUsername(username: Username): Promise<RadiusUserPasswords | null> {
        return await F.pipe(
            TE.tryCatch(() => this.repository.findOneBy({ username }), E.toError),
            TE.flatMap((entity) => (entity ? TE.fromEither(this.decodeEntity(entity)) : TE.right(null))),
            getOrThrow(),
        )()
    }

    private decodeEntity({
        username,
        clearText,
        ntHash,
        ssha512,
    }: RadiusUserPasswordEntity): E.Either<Error, RadiusUserPasswords> {
        return F.pipe(
            UsernameType.decode(username),
            E.map((username) => ({ username, clearText, ntHash, ssha512 })),
            mapValidationLeftError((error) => new Error(error)),
        )
    }

    private readonly manager: EntityManager

    private readonly repository: Repository<RadiusUserPasswordEntity>

    constructor(@Inject(DataSource) dataSource: DataSource) {
        super()
        this.manager = dataSource.manager
        this.repository = dataSource.manager.getRepository(RadiusUserPasswordEntity)
    }
}

export const entities = [RadiusUserPasswordEntity]
