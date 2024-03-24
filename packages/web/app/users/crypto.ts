"use client"

import { md4, sha512 } from "hash-wasm"

export async function ssha512(password: string): Promise<string> {
    const data = new TextEncoder().encode(password)
    const salt = crypto.getRandomValues(new Uint8Array(16))

    const hash = await sha512(new Uint8Array([...data, ...salt]))
    return hash + Array.prototype.map.call(salt, (byte: number) => byte.toString(16).padStart(2, "0")).join("")
}

export async function nthash(password: string): Promise<string> {
    const utf16 = new Uint16Array(password.length)
    for (let i = 0; i < password.length; i++) {
        utf16[i] = password.charCodeAt(i)
    }

    const utf16le = new Uint8Array(utf16.length * 2)
    for (let i = 0; i < utf16.length; i++) {
        utf16le[i * 2] = utf16[i] & 0xff
        utf16le[i * 2 + 1] = utf16[i] >> 8
    }

    return await md4(utf16le)
}
