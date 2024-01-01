"use client"

import { useReducer } from "react"
import { useQueryClient } from "react-query"

export function useNonce() {
    const [nonce, increaseNonce] = useReducer((nonce: number) => nonce + 1, 0)
    return { nonce, increaseNonce }
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
    const { nonce, increaseNonce } = useNonce()
    const queryClient = useQueryClient()

    return {
        invalidate: async () => {
            await queryClient.invalidateQueries({ queryKey })
            increaseNonce()
        },
        nonce,
        queryClient,
    }
}
