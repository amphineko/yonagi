import { CallingStationIdAuthentication } from "@yonagi/common/types/mpsks/MPSK"
import useSWR from "swr"
import useSWRMutation from "swr/mutation"

import { bulkCreateOrUpdateMpsks, createOrUpdateMpskByName, deleteMpskByName, listMpsks } from "./actions"
import { useNotifications } from "../../lib/notifications"

const MPSKS_KEY = ["mpsks"]

export function useMpsks() {
    const { notifyError } = useNotifications()

    return useSWR(
        MPSKS_KEY,
        async () => {
            return await listMpsks()
        },
        {
            onError: (error) => {
                notifyError(`Cannot list all MPSKs`, String(error))
            },
        },
    )
}

export function useUpdateMpsk() {
    const { notifyError, notifySuccess } = useNotifications()

    return useSWRMutation(
        MPSKS_KEY,
        async (_, { arg: mpsk }: { arg: CallingStationIdAuthentication }): Promise<CallingStationIdAuthentication> => {
            await createOrUpdateMpskByName(mpsk.name, mpsk)
            return mpsk
        },
        {
            onError: (error) => {
                notifyError(`Cannot update MPSK`, String(error))
            },
            onSuccess: ({ name }) => {
                notifySuccess(`MPSK "${name}" updated`)
            },
        },
    )
}

export function useDeleteMpsk() {
    const { notifyError, notifySuccess } = useNotifications()

    return useSWRMutation(
        MPSKS_KEY,
        async (_, { arg: name }: { arg: string }): Promise<string> => {
            await deleteMpskByName(name)
            return name
        },
        {
            onError: (error) => {
                notifyError(`Cannot delete MPSK`, String(error))
            },
            onSuccess: (name) => {
                notifySuccess(`MPSK "${name}" deleted`)
            },
        },
    )
}

export function useImportMpsks() {
    const { notifyError, notifySuccess } = useNotifications()

    return useSWRMutation(
        MPSKS_KEY,
        async (_, { arg: mpsks }: { arg: readonly CallingStationIdAuthentication[] }): Promise<void> => {
            await bulkCreateOrUpdateMpsks(mpsks)
        },
        {
            onError: (error) => {
                notifyError(`Cannot import MPSKs`, String(error))
            },
            onSuccess: () => {
                notifySuccess(`MPSKs imported`)
            },
        },
    )
}
