import { MigrationInterface, QueryRunner } from "typeorm";

export class SqlitePki1700000000002 implements MigrationInterface {
    name = 'SqlitePki1700000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "certificate_authority" ("id" varchar PRIMARY KEY NOT NULL, "serialNumber" varchar(32) NOT NULL, "notBefore" datetime NOT NULL, "notAfter" datetime NOT NULL, "commonName" text NOT NULL, "organizationName" text NOT NULL, "certBer" blob NOT NULL, "privateKeyBer" blob NOT NULL, "revokedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "rowVersion" integer NOT NULL, CONSTRAINT "UQ_5efd7abaa4de971a6d2bd473729" UNIQUE ("serialNumber"))`);
        await queryRunner.query(`CREATE TABLE "server_certificate" ("id" varchar PRIMARY KEY NOT NULL, "serialNumber" varchar(32) NOT NULL, "notBefore" datetime NOT NULL, "notAfter" datetime NOT NULL, "commonName" text NOT NULL, "organizationName" text NOT NULL, "certBer" blob NOT NULL, "privateKeyBer" blob NOT NULL, "revokedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "rowVersion" integer NOT NULL, CONSTRAINT "UQ_db9ad98be51a73183c6df83caad" UNIQUE ("serialNumber"))`);
        await queryRunner.query(`CREATE TABLE "client_certificate" ("id" varchar PRIMARY KEY NOT NULL, "serialNumber" varchar(32) NOT NULL, "notBefore" datetime NOT NULL, "notAfter" datetime NOT NULL, "commonName" text NOT NULL, "organizationName" text NOT NULL, "certBer" blob NOT NULL, "privateKeyBer" blob NOT NULL, "revokedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "rowVersion" integer NOT NULL, CONSTRAINT "UQ_45688f0fa8a4baa8fde2a22a2a9" UNIQUE ("serialNumber"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "client_certificate"`);
        await queryRunner.query(`DROP TABLE "server_certificate"`);
        await queryRunner.query(`DROP TABLE "certificate_authority"`);
    }

}
