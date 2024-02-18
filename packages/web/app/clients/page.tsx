"use client"

import { Add, Delete, Save } from "@mui/icons-material"
import {
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
} from "@mui/material"
import { ListClientsResponseType } from "@yonagi/common/api/clients"
import { Client, ClientType } from "@yonagi/common/types/Client"
import { IpNetworkFromStringType } from "@yonagi/common/types/IpNetworkFromString"
import { Name, NameType } from "@yonagi/common/types/Name"
import { SecretType } from "@yonagi/common/types/Secret"
import { getOrThrow } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "react-query"

import { bulkCreateOrUpdate, createOrUpdateByName, deleteByName, getAllClients } from "./actions"
import { useQueryHelpers } from "../../lib/client"
import { mapLeftValidationError } from "../../lib/fp"
import { useNotifications } from "../../lib/notifications"
import { ValidatedTableCell } from "../../lib/tables"
import { ExportButton, ImportButton } from "../../lib/upload"

const CLIENT_QUERY_KEY = ["clients"]

function useBulkCreateOrUpdate() {
    const { invalidate } = useQueryHelpers(CLIENT_QUERY_KEY)
    const { notifyError, notifySuccess } = useNotifications()
    return useMutation({
        mutationFn: async (clients: readonly Client[]) => {
            await bulkCreateOrUpdate(clients)
        },
        mutationKey: ["clients", "bulk-update"],
        onError: (error) => {
            notifyError(`Failed importing clients`, String(error))
        },
        onSuccess: (_, clients) => {
            notifySuccess(`Imported ${clients.length} clients`)
        },
        onSettled: invalidate,
    })
}

function useCreateOrUpdateClient({ name, onSuccess }: { name: string; onSuccess: () => void }) {
    const { invalidate } = useQueryHelpers(CLIENT_QUERY_KEY)
    const { notifyError, notifySuccess } = useNotifications()
    return useMutation({
        mutationFn: async (validation: t.Validation<Client>) => {
            await F.pipe(
                validation,
                mapLeftValidationError((error) => new Error(`Cannot validate input: ${error}`)),
                TE.fromEither,
                TE.flatMap((client) =>
                    TE.tryCatch(
                        () => createOrUpdateByName(name, client),
                        (error) => new Error(String(error)),
                    ),
                ),
                getOrThrow(),
            )()
        },
        mutationKey: ["clients", "update", name],
        onError: (error) => {
            notifyError(`Failed updating client ${name}`, String(error))
        },
        onSuccess: () => {
            notifySuccess(`Updated client ${name}`)
            setTimeout(onSuccess, 0)
        },
        onSettled: invalidate,
    })
}

function useDeleteClient(name: string) {
    const { invalidate } = useQueryHelpers(CLIENT_QUERY_KEY)
    const { notifyError, notifySuccess } = useNotifications()
    return useMutation<unknown, unknown, string>({
        mutationFn: (name) => deleteByName(name),
        mutationKey: ["clients", "delete", name],
        onError: (error, name) => {
            notifyError(`Failed deleting client ${name}`, String(error))
        },
        onSuccess: (_, name) => {
            notifySuccess(`Deleted client ${name}`, "")
        },
        onSettled: invalidate,
    })
}

function useListClients() {
    const { invalidate } = useQueryHelpers(CLIENT_QUERY_KEY)
    const { notifyError } = useNotifications()
    return useQuery({
        queryFn: async (): Promise<readonly Client[]> => await getAllClients(),
        queryKey: CLIENT_QUERY_KEY,
        onError: (error) => {
            notifyError("Failed reading clients", String(error))
        },
        onSettled: () => {
            void invalidate()
        },
    })
}

function ClientTableRow({
    isCreateOrUpdate,
    name: serverName,
    serverValue,
}: {
    isCreateOrUpdate: "create" | "update"
    key: string
    name?: Name
    serverValue: Partial<Client>
}): JSX.Element {
    const [name, setName] = useState<string>(serverName ?? "")
    const isNameModified = useMemo(() => name !== (serverName ?? ""), [serverName, name])

    const [ipaddr, setIpaddr] = useState<string>(
        serverValue.ipaddr ? IpNetworkFromStringType.encode(serverValue.ipaddr) : "",
    )
    const isIpaddrModified = useMemo(
        () =>
            ipaddr !==
            (serverValue.ipaddr
                ? // check against initial value if present (for updating)
                  IpNetworkFromStringType.encode(serverValue.ipaddr)
                : // otherwise check against empty string (for creating)
                  ""),
        [serverValue.ipaddr, ipaddr],
    )

    const [secret, setSecret] = useState<string>(serverValue.secret ?? "")
    const isSecretModified = useMemo(() => secret !== (serverValue.secret ?? ""), [serverValue.secret, secret])

    const formValidation = useMemo<t.Validation<Client>>(
        () =>
            F.pipe(
                IpNetworkFromStringType.decode(ipaddr),
                E.flatMap((ipaddr) => ClientType.decode({ name, ipaddr, secret })),
            ),
        [ipaddr, name, secret],
    )

    const { mutate: submitUpdate } = useCreateOrUpdateClient({
        name,
        onSuccess: () => {
            if (isCreateOrUpdate === "create") {
                setName(serverName ?? "")
                setIpaddr("")
                setSecret("")
            }
        },
    })
    const { mutate: submitDelete } = useDeleteClient(name)

    return (
        <TableRow
            onKeyDown={(event) => {
                if (event.key === "Enter") submitUpdate(formValidation)
            }}
        >
            <ValidatedTableCell
                disabled={isCreateOrUpdate === "update"}
                isModified={isNameModified}
                onChange={setName}
                validate={(value) => NameType.decode(value)}
                value={name}
            />
            <ValidatedTableCell
                isModified={isIpaddrModified}
                onChange={setIpaddr}
                validate={(value) => IpNetworkFromStringType.decode(value)}
                value={ipaddr}
            />
            <ValidatedTableCell
                isModified={isSecretModified}
                onChange={setSecret}
                validate={(value) => SecretType.decode(value)}
                value={secret}
            />

            {isCreateOrUpdate === "create" && (
                <TableCell>
                    <IconButton
                        aria-label="Create"
                        disabled={E.isLeft(formValidation)}
                        onClick={() => {
                            submitUpdate(formValidation)
                        }}
                    >
                        <Add />
                    </IconButton>
                </TableCell>
            )}

            {isCreateOrUpdate === "update" && (
                <TableCell>
                    <IconButton
                        aria-label="Update"
                        disabled={E.isLeft(formValidation)}
                        onClick={() => {
                            submitUpdate(formValidation)
                        }}
                    >
                        <Save />
                    </IconButton>
                    <IconButton
                        aria-label="Delete"
                        onClick={() => {
                            submitDelete(name)
                        }}
                    >
                        <Delete />
                    </IconButton>
                </TableCell>
            )}
        </TableRow>
    )
}

function ClientTable(): JSX.Element {
    const { data: clients } = useListClients()
    const { mutate: importClients } = useBulkCreateOrUpdate()

    const tableItems = useMemo(() => {
        if (clients === undefined) {
            return []
        }
        return clients.map((client) => (
            <ClientTableRow serverValue={client} isCreateOrUpdate="update" key={client.name} name={client.name} />
        ))
    }, [clients])

    return (
        <TableContainer>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Allowed Subnet</TableCell>
                        <TableCell>Secret</TableCell>
                        <TableCell>Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tableItems}
                    <ClientTableRow serverValue={{}} isCreateOrUpdate="create" key={`create`} />
                </TableBody>
                <TableFooter>
                    <TableRow>
                        <TableCell colSpan={4}>
                            <ExportButton
                                data={clients ?? []}
                                encoder={ListClientsResponseType}
                                filename="clients.json"
                            />
                            <ImportButton
                                decoder={ListClientsResponseType}
                                onImport={(clients) => {
                                    importClients(clients)
                                }}
                            />
                        </TableCell>
                    </TableRow>
                </TableFooter>
            </Table>
        </TableContainer>
    )
}

export default function ClientDashboardPage() {
    return (
        <div>
            <ClientTable />
        </div>
    )
}
