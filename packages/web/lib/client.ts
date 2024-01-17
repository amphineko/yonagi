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
