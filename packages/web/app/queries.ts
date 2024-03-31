"use client"

import useSWR from "swr"
import useSWRMutation from "swr/mutation"

import { getStatus, reloadRadiusd, restartRadiusd } from "./actions"

export function useRadiusdStatus() {
    return useSWR(["radiusd", "status"], getStatus, {
        refreshInterval: 1000,
    })
}

export function useRestartRadiusd() {
    return useSWRMutation(["radiusd", "status"], restartRadiusd)
}

export function useReloadRadiusd() {
    return useSWRMutation(["radiusd", "status"], reloadRadiusd)
}
