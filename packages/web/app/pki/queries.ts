import { SerialNumberString } from "@yonagi/common/types/pki/SerialNumberString"
import useSWR from "swr"
import useSWRMutation from "swr/mutation"

import { deleteCertificateAuthority, deleteClientCertificate, deleteServerCertificate, getPkiSummary } from "./actions"
import { useNotifications } from "../../lib/notifications"

export function usePkiSummary() {
    return useSWR(["pki"], async () => {
        return await getPkiSummary()
    })
}

export function useDeleteCertificateAuthority() {
    const { notifyError, notifySuccess } = useNotifications()

    return useSWRMutation(
        ["pki"],
        async (_, { arg: serial }: { arg: SerialNumberString }) => {
            await deleteCertificateAuthority(serial)
        },
        {
            onError: (error) => {
                notifyError(`Cannot delete certificate authority`, String(error))
            },
            onSuccess: () => {
                notifySuccess(`Certificate authority deleted`)
            },
        },
    )
}

export function useDeleteServerCertificate() {
    const { notifyError, notifySuccess } = useNotifications()

    return useSWRMutation(
        ["pki"],
        async (_, { arg: serial }: { arg: SerialNumberString }) => {
            await deleteServerCertificate(serial)
        },
        {
            onError: (error) => {
                notifyError(`Cannot delete server certificate`, String(error))
            },
            onSuccess: () => {
                notifySuccess(`Server certificate deleted`)
            },
        },
    )
}

export function useDeleteClientCertificate() {
    const { notifyError, notifySuccess } = useNotifications()

    return useSWRMutation(
        ["pki"],
        async (_, { arg: serial }: { arg: SerialNumberString }) => {
            await deleteClientCertificate(serial)
        },
        {
            onError: (error) => {
                notifyError(`Cannot delete client certificate`, String(error))
            },
            onSuccess: () => {
                notifySuccess(`Client certificate deleted`)
            },
        },
    )
}
