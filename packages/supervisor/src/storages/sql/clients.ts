import { Inject, Injectable, forwardRef } from "@nestjs/common"
import { Client, ClientType } from "@yonagi/common/clients"
import { IpNetworkFromStringType, Name, NameType, SecretType } from "@yonagi/common/common"
import { resolveOrThrow } from "@yonagi/common/utils/TaskEither"
import * as A from "fp-ts/lib/Array"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import { BaseEntity, Column, DataSource, Entity, EntityManager, PrimaryGeneratedColumn, Repository } from "typeorm"

import { AbstractClientStorage } from ".."

@Entity("clients")
export class SqlClientEntity extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    public id!: string

    @Column({ unique: true })
    public name!: string

    @Column({ nullable: false })
    public ipaddr!: string

    @Column({ nullable: false })
    public secret!: string
}

@Injectable()
export class SqlClientStorage extends AbstractClientStorage {
    private readonly manager: EntityManager

    private readonly repository: Repository<SqlClientEntity>

    constructor(@Inject(forwardRef(() => DataSource)) dataSource: DataSource) {
        super()
        this.manager = dataSource.manager
        this.repository = dataSource.manager.getRepository(SqlClientEntity)
    }

    async all(): Promise<readonly Client[]> {
        return await F.pipe(
            TE.tryCatch(() => this.repository.find(), E.toError),
            TE.flatMapEither(
                F.flow(
                    A.map((entity) => this.decodeClientEntity(entity)),
                    A.sequence(E.Applicative),
                ),
            ),
            resolveOrThrow(),
        )()
    }

    async createOrUpdateByName(name: Name, value: Client): Promise<void> {
        if (name !== value.name) {
            throw new Error(`Queried name doesn't match with the entity's name field: ${name} !== ${value.name}`)
        }

        await this.manager.transaction(async (manager) => {
            await manager
                .findOneBy(SqlClientEntity, { name })
                .then((entity) => entity ?? manager.create(SqlClientEntity))
                .then((entity) => {
                    entity.name = NameType.encode(name)
                    entity.ipaddr = IpNetworkFromStringType.encode(value.ipaddr)
                    entity.secret = SecretType.encode(value.secret)
                    return manager.save(entity)
                })
        })
    }

    async deleteByName(name: Name): Promise<boolean> {
        const affected = (await this.repository.delete({ name })).affected
        if (typeof affected !== "number") {
            throw new Error("Underlying database driver does not support affected rows")
        }
        return affected > 0
    }

    async getByName(name: Name): Promise<Client | null> {
        return await F.pipe(
            TE.tryCatch(() => this.repository.findOneBy({ name }), E.toError),
            TE.flatMap((entity) => (entity ? TE.fromEither(this.decodeClientEntity(entity)) : TE.right(null))),
            TE.getOrElse((error) => {
                throw error
            }),
        )()
    }

    private decodeClientEntity({ name, ipaddr, secret }: SqlClientEntity): E.Either<Error, Client> {
        return F.pipe(
            IpNetworkFromStringType.decode(ipaddr),
            E.flatMap((ipaddr) => ClientType.decode({ name, ipaddr, secret })),
            E.mapLeft((errors) => new Error(PR.failure(errors).join("\n"))),
        )
    }
}
