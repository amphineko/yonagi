"use client"

import {
    DataGrid,
    DataGridBody,
    DataGridCell,
    DataGridHeader,
    DataGridRow,
    TableColumnDefinition,
    createTableColumn,
} from "@fluentui/react-components"
import { Client } from "@yonagi/common/clients"
import { IpNetworkFromString, IpNetworkFromStringType, Name } from "@yonagi/common/common"
import { PropsWithChildren, useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "react-query"

import { createOrUpdateByName, deleteByName, getAllClients } from "./actions"
import { DeleteRowButton, ElementOfArray, MutableCell } from "../../lib/tables"

const CLIENT_QUERY_KEY = ["clients"]

export function ClientTable({ clients }: PropsWithChildren<{ clients: ReadonlyMap<Name, Client> }>): JSX.Element {
    const queryClient = useQueryClient()
    const { mutate: edit, isLoading: isEditLoading } = useMutation<unknown, unknown, { name: Name; value: Client }>({
        mutationFn: async ({ name, value }) => {
            await createOrUpdateByName(name, value)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEY }),
    })
    const { mutate: deleteRow, isLoading: isDeleteLoading } = useMutation<unknown, unknown, Name>({
        mutationFn: deleteByName,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: CLIENT_QUERY_KEY }),
    })

    const items = useMemo(() => [...clients.entries()], [clients])
    const columns: TableColumnDefinition<ElementOfArray<typeof items>>[] = [
        createTableColumn({
            columnId: "name",
            renderHeaderCell: () => "Name",
            renderCell: ([name]) => name,
        }),
        createTableColumn({
            columnId: "ipaddr",
            renderHeaderCell: () => "Allowed subnet",
            renderCell: ([name, client]) => (
                <MutableCell<IpNetworkFromString>
                    codec={IpNetworkFromStringType}
                    decodedInitialValue={client.ipaddr}
                    isMutating={isEditLoading}
                    mutate={(ipaddr) => {
                        edit({ name, value: { ...client, ipaddr } })
                    }}
                />
            ),
        }),
        createTableColumn({
            columnId: "actions",
            renderHeaderCell: () => "Actions",
            renderCell: ([name]) => <DeleteRowButton name={name} isMutating={isDeleteLoading} mutate={deleteRow} />,
        }),
    ]

    return (
        <DataGrid columns={columns} items={items}>
            <DataGridHeader>
                <DataGridRow>
                    {({ renderHeaderCell }) => <DataGridCell>{renderHeaderCell(columns[0])}</DataGridCell>}
                </DataGridRow>
            </DataGridHeader>
            <DataGridBody<ElementOfArray<typeof items>>>
                {({ item, rowId }) => (
                    <DataGridRow key={rowId}>
                        {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
                    </DataGridRow>
                )}
            </DataGridBody>
        </DataGrid>
    )
}

export default function ClientDashboardPage() {
    const { data: clients } = useQuery<ReadonlyMap<Name, Client>>(CLIENT_QUERY_KEY, async () => await getAllClients())

    return (
        <div>
            <ClientTable clients={clients ?? new Map()} />
        </div>
    )
}
