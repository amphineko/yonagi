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
import { Name } from "@yonagi/common/common"
import {
    CallingStationId,
    CallingStationIdAuthentication,
    CallingStationIdType,
    PSK,
    PSKType,
} from "@yonagi/common/mpsks"
import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "react-query"

import { createOrUpdateByName, deleteByName, getAllMpsks } from "./actions"
import { DeleteRowButton, ElementOfArray, MutableCell } from "../../lib/tables"

const MPSK_QUERY_KEY = "mpsks"

function MpskTable({ mpsks }: { mpsks: ReadonlyMap<Name, CallingStationIdAuthentication> }) {
    const queryClient = useQueryClient()
    const { mutate: edit, isLoading: isEditLoading } = useMutation<
        unknown,
        unknown,
        { name: Name; value: CallingStationIdAuthentication }
    >({
        mutationFn: async ({ name, value }) => {
            await createOrUpdateByName(name, value)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MPSK_QUERY_KEY }),
    })
    const { mutate: deleteRow, isLoading: isDeleteLoading } = useMutation<unknown, unknown, Name>({
        mutationFn: deleteByName,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: MPSK_QUERY_KEY }),
    })

    const items = useMemo(() => [...mpsks.entries()], [mpsks])
    const columns: TableColumnDefinition<ElementOfArray<typeof items>>[] = [
        createTableColumn({
            columnId: "name",
            renderHeaderCell: () => "Name",
            renderCell: ([name]) => name,
        }),
        createTableColumn({
            columnId: "macaddr",
            renderHeaderCell: () => "MAC Address",
            renderCell: ([name, mpsk]) => (
                <MutableCell<CallingStationId>
                    codec={CallingStationIdType}
                    decodedInitialValue={mpsk.callingStationId}
                    isMutating={isEditLoading}
                    mutate={(callingStationId) => {
                        edit({ name, value: { ...mpsk, callingStationId } })
                    }}
                />
            ),
        }),
        createTableColumn({
            columnId: "psk",
            renderHeaderCell: () => "PSK",
            renderCell: ([name, mpsk]) => (
                <MutableCell<PSK>
                    codec={PSKType}
                    decodedInitialValue={mpsk.psk}
                    isMutating={isEditLoading}
                    mutate={(psk) => {
                        edit({ name, value: { ...mpsk, psk } })
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

export default function MpskDashboardPage() {
    const { data: mpsks } = useQuery<ReadonlyMap<Name, CallingStationIdAuthentication>>(MPSK_QUERY_KEY, async () => {
        return new Map(await getAllMpsks())
    })

    return <MpskTable mpsks={mpsks ?? new Map()} />
}
