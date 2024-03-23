"use client"

import { useReducer, useState } from "react"
import { useQueryClient } from "react-query"

export function useNonce() {
    const [nonce, increaseNonce] = useReducer((nonce: number) => nonce + 1, 0)
    return { nonce, increaseNonce }
}

export function useStagedNonce() {
    const [nextNonce, increaseNonce] = useReducer((nonce: number) => nonce + 1, 0)
    const [nonce, setNonce] = useState(nextNonce)

    return {
        nonce,
        increaseNonce,
        publishNonce: () => {
            setNonce(nextNonce)
        },
    }
}

export function withNonce<F extends (...args: never[]) => never>(
    increase: () => void,
    f: F,
): (...args: Parameters<F>) => ReturnType<F> {
    return (...args) => {
        increase()
        return f(...args)
    }
}

export function useQueryHelpers(queryKey: readonly unknown[]) {
    const queryClient = useQueryClient()

    return {
        invalidate: async () => {
            await queryClient.invalidateQueries({ queryKey })
        },
    }
}

export function base64ToBlob(base64: string, type: string) {
    const byteCharacters = atob(base64)
    const byteArray = new Uint8Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i)
    }
    return new Blob([byteArray], { type })
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    try {
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
    } finally {
        URL.revokeObjectURL(url)
    }
}
