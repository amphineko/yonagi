import { describe, expect, test } from "@jest/globals"
import { Client } from "@yonagi/common/types/Client"
import { IpAddressFromStringType } from "@yonagi/common/types/IpAddressFromString"
import { IpNetworkFromStringType } from "@yonagi/common/types/IpNetworkFromString"
import { NameType } from "@yonagi/common/types/Name"
import { SecretType } from "@yonagi/common/types/Secret"
import * as E from "fp-ts/lib/Either"

import { DynamicClientResolver } from "./dynclients"
import { AbstractClientStorage } from "../storages"

class MockClientStorage extends AbstractClientStorage {
    constructor(private readonly clients: Client[]) {
        super()
    }

    all(): Promise<Client[]> {
        return Promise.resolve(this.clients)
    }

    bulkCreateOrUpdate(): Promise<void> {
        throw new Error("Method not implemented.")
    }

    createOrUpdateByName(): Promise<void> {
        throw new Error("Method not implemented.")
    }

    deleteByName(): Promise<boolean> {
        throw new Error("Method not implemented.")
    }

    getByName(): Promise<Client | null> {
        throw new Error("Method not implemented.")
    }
}

describe("DynamicClientResolver", () => {
    const clients: Client[] = [
        {
            ipaddr: rightOrThrow(IpNetworkFromStringType.decode("10.0.1.0/24")),
            name: rightOrThrow(NameType.decode("test")),
            secret: rightOrThrow(SecretType.decode("test")),
        },
        {
            ipaddr: rightOrThrow(IpNetworkFromStringType.decode("10.0.0.0/8")),
            name: rightOrThrow(NameType.decode("test")),
            secret: rightOrThrow(SecretType.decode("test")),
        },
    ]
    const resolver = new DynamicClientResolver(new MockClientStorage(clients))

    async function testResolve(ip: string, expected: Client | null): Promise<void> {
        const resolved = await resolver.getClientBySourceIp(rightOrThrow(IpAddressFromStringType.decode(ip)))
        expect(resolved).toEqual(expected)
    }

    for (const ip of ["10.0.1.0", "10.0.1.1", "10.0.1.254", "10.0.1.255"]) {
        test(`${ip} should be resolved to 10.0.1.0/24`, async () => {
            await testResolve(ip, clients[0])
        })
    }

    for (const ip of ["10.0.0.1", "10.251.4.40"]) {
        test(`${ip} should be resolved to 10.0.0.0/8`, async () => {
            await testResolve(ip, clients[1])
        })
    }

    for (const ip of ["192.168.1.1", "1.1.1.1"]) {
        test(`${ip} should not be resolved`, async () => {
            await testResolve(ip, null)
        })
    }
})

function rightOrThrow<T>(e: E.Either<unknown, T>): T {
    if (E.isLeft(e)) {
        throw new Error("Expected right")
    }

    return e.right
}
