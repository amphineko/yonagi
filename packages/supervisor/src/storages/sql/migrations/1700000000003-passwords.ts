import { MigrationInterface, QueryRunner } from "typeorm";

export class Passwords1700000000003 implements MigrationInterface {
    name = 'Passwords1700000000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_passwords" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "username" varchar NOT NULL, "cleartext" varchar(32), "nthash" varchar(32), "ssha512" varchar(192))`);
        await queryRunner.query(`INSERT INTO "user_passwords"("username", "cleartext", "nthash", "ssha512") VALUES ('test', NULL, NULL, '0x2a757bad0fa1cc04d513b3ea2122d7d3e7d134df8e17f901d88e29a489752e6cf60e7ea8ebfbc9239616f009a43ea13fac872d7c7b7831c08f26b3119058dc16905009f723ca4695398cfdb71e4b970f')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "user_passwords"`);
    }

}
