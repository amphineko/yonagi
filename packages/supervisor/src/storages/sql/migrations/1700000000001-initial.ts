import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1700000000001 implements MigrationInterface {
    name = 'Initial1700000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "clients" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "ipaddr" varchar NOT NULL, "secret" varchar NOT NULL, CONSTRAINT "UQ_99e921caf21faa2aab020476e44" UNIQUE ("name"))`);
        await queryRunner.query(`CREATE TABLE "mpsks" ("id" varchar PRIMARY KEY NOT NULL, "name" varchar NOT NULL, "callingStationId" varchar NOT NULL, "psk" varchar NOT NULL, CONSTRAINT "UQ_673f610868ad34355f3e7f78e5f" UNIQUE ("name"))`);
        await queryRunner.query(`INSERT INTO "clients" ("id", "name", "ipaddr", "secret") VALUES ("5a45f966-74f2-46dc-9654-18f70782cfcc", "permit-any", "0.0.0.0/0", "test")`);
        await queryRunner.query(`INSERT INTO "mpsks" ("id", "name", "callingStationId", "psk") VALUES ("beab6fd5-860b-4d80-8e51-d2454e9135f3", "test-device", "11-22-33-44-55-ff", "password")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "mpsks"`);
        await queryRunner.query(`DROP TABLE "clients"`);
    }

}
