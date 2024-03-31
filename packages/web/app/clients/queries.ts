import { Client } from "@yonagi/common/types/Client"
import useSWR from "swr"
import useSWRMutation from "swr/mutation"

import { bulkCreateOrUpdateClient, createOrUpdateClientByName, deleteClientByName, listClients } from "./actions"
import { useNotifications } from "../../lib/notifications"

const RADIUS_CLIENTS_KEY = ["clients"]

export function useRadiusClients() {
    const { notifyError } = useNotifications()

    return useSWR(
        RADIUS_CLIENTS_KEY,
        async () => {
            return await listClients()
        },
        {
            onError: (error) => {
                notifyError(`Cannot list all clients`, String(error))
            },
        },
    )
}

export function useCreateClient() {
    const { notifyError, notifySuccess } = useNotifications()
    return useSWRMutation(
        RADIUS_CLIENTS_KEY,
        async (_, { arg: client }: { arg: Client }): Promise<string> => {
            await createOrUpdateClientByName(client.name, client)
            return client.name
        },
        {
            onError: (error) => {
                notifyError(`Cannot create client`, String(error))
            },
            onSuccess: (name) => {
                notifySuccess(`Client "${name}" created`)
            },
        },
    )
}

export function useUpdateClient() {
    const { notifyError, notifySuccess } = useNotifications()
    return useSWRMutation(
        RADIUS_CLIENTS_KEY,
        async (_, { arg: client }: { arg: Client }): Promise<Client> => {
            await createOrUpdateClientByName(client.name, client)
            return client
        },
        {
            onError: (error) => {
                notifyError(`Cannot update client`, String(error))
            },
            onSuccess: ({ name }) => {
                notifySuccess(`Client "${name}" updated`)
            },
        },
    )
}

export function useDeleteClient() {
    const { notifyError, notifySuccess } = useNotifications()
    return useSWRMutation(
        RADIUS_CLIENTS_KEY,
        async (_, { arg: name }: { arg: string }): Promise<string> => {
            await deleteClientByName(name)
            return name
        },
        {
            onError: (error) => {
                notifyError(`Cannot delete client`, String(error))
            },
            onSuccess: (name) => {
                notifySuccess(`Client "${name}" deleted`)
            },
        },
    )
}

export function useImportClients() {
    const { notifyError, notifySuccess } = useNotifications()
    return useSWRMutation(
        RADIUS_CLIENTS_KEY,
        async (_, { arg: clients }: { arg: readonly Client[] }): Promise<number> => {
            await bulkCreateOrUpdateClient(clients)
            return clients.length
        },
        {
            onError: (error) => {
                notifyError(`Cannot import clients`, String(error))
            },
            onSuccess: (count) => {
                notifySuccess(`Imported ${count} clients`)
            },
        },
    )
}
