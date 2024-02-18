import { Inject, Injectable, forwardRef } from "@nestjs/common"
import { Client } from "@yonagi/common/types/Client"
import { IpAddress } from "@yonagi/common/types/IpAddress"

import { AbstractClientStorage } from "../storages"

function clampBigIntCompare(o: bigint): number {
    return o === 0n ? 0 : o < 0n ? -1 : 1
}

@Injectable()
export class DynamicClientResolver {
    constructor(@Inject(forwardRef(() => AbstractClientStorage)) private readonly storage: AbstractClientStorage) {}

    async getClientBySourceIp({ address: srcAddress, family: srcFamily }: IpAddress): Promise<Client | null> {
        const clients = Array.from(await this.storage.all())
            .filter(({ ipaddr: { address } }) => address.family === srcFamily)
            .sort((a, b) => {
                // by netmask size desc, then by address asc
                const netmask = b.ipaddr.netmask - a.ipaddr.netmask
                const address = a.ipaddr.address.address - b.ipaddr.address.address
                return netmask !== 0 ? netmask : clampBigIntCompare(address)
            })
            .filter(({ ipaddr: { address, netmask } }) => {
                const mask = DynamicClientResolver.getBitMask(netmask, srcFamily)
                return (srcAddress & mask) === (address.address & mask)
            })
        return clients.length > 0 ? clients[0] : null
    }

    private static getBitMask(n: number, family: "inet" | "inet6"): bigint {
        if (family === "inet") {
            return 0xffffffffn << BigInt(32 - n)
        } else {
            return 0xffffffffffffffffffffffffffffffffn << BigInt(128 - n)
        }
    }
}
