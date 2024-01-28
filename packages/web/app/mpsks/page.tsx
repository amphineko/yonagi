"use client"

import { Add, Delete, Save } from "@mui/icons-material"
import {
    IconButton,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    Tooltip,
} from "@mui/material"
import { BulkCreateOrUpdateMPSKsRequestType, ListMPSKsResponseType } from "@yonagi/common/api/mpsks"
import { CallingStationIdType } from "@yonagi/common/types/CallingStationId"
import { CallingStationIdAuthentication, MPSKType } from "@yonagi/common/types/MPSK"
import { Name, NameType } from "@yonagi/common/types/Name"
import { PSKType } from "@yonagi/common/types/PSK"
import { resolveOrThrow } from "@yonagi/common/utils/TaskEither"
import * as E from "fp-ts/lib/Either"
import * as TE from "fp-ts/lib/TaskEither"
import * as F from "fp-ts/lib/function"
import * as PR from "io-ts/lib/PathReporter"
import * as t from "io-ts/lib/index"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "react-query"

import { bulkCreateOrUpdate, createOrUpdateByName, deleteByName, getAllMpsks } from "./actions"
import { useQueryHelpers } from "../../lib/client"
import { mapLeftValidationError } from "../../lib/fp"
import { useNotifications } from "../../lib/notifications"
import { ValidatedTableCell } from "../../lib/tables"
import { ExportButton, ImportButton } from "../../lib/upload"

const MPSK_QUERY_KEY = ["mpsks"]

function useBulkCreateOrUpdateMpsks() {
    const { invalidate } = useQueryHelpers(MPSK_QUERY_KEY)
    const { notifyError, notifySuccess } = useNotifications()
    return useMutation({
        mutationFn: async (mpsks: readonly CallingStationIdAuthentication[]) => {
            await bulkCreateOrUpdate(mpsks)
        },
        mutationKey: ["mpsks", "bulk-update"],
        onError: (error) => {
            notifyError(`Failed importing MPSKs`, String(error))
        },
        onSuccess: (_, mpsks) => {
            notifySuccess(`Imported ${mpsks.length} MPSKs`)
        },
        onSettled: invalidate,
    })
}

function useDeleteMpsk(name: string) {
    const { notifyError, notifySuccess } = useNotifications()
    const { invalidate } = useQueryHelpers(MPSK_QUERY_KEY)
    return useMutation({
        mutationFn: async () => {
            await deleteByName(name)
        },
        mutationKey: ["mpsks", "delete", name],
        onError: (error) => {
            notifyError(`Failed deleting ${name}`, String(error))
        },
        onSuccess: () => {
            notifySuccess(`Deleted ${name}`)
        },
        onSettled: () => {
            void invalidate()
        },
    })
}

function useUpdateMpsk({ name, onSuccess }: { name: string; onSuccess: () => void }) {
    const { notifyError, notifySuccess } = useNotifications()
    const { invalidate } = useQueryHelpers(MPSK_QUERY_KEY)
    return useMutation({
        mutationFn: async (validation: t.Validation<CallingStationIdAuthentication>) => {
            await F.pipe(
                validation,
                mapLeftValidationError((error) => new Error(`Cannot validate input: ${error}`)),
                TE.fromEither,
                TE.flatMap((mpsk) => TE.tryCatch(() => createOrUpdateByName(name, mpsk), E.toError)),
                resolveOrThrow(),
            )()
        },
        mutationKey: ["mpsks", "update", name],
        onError: (error) => {
            notifyError(`Failed updating ${name}`, String(error))
        },
        onSuccess: () => {
            notifySuccess(`Updated ${name}`)
            setTimeout(onSuccess, 1000)
        },
        onSettled: () => {
            void invalidate()
        },
    })
}

function useListMpsks() {
    const { notifyError } = useNotifications()
    const { invalidate } = useQueryHelpers(MPSK_QUERY_KEY)
    return useQuery({
        queryFn: async () => await getAllMpsks(),
        queryKey: MPSK_QUERY_KEY,
        onError: (error) => {
            notifyError(`Failed listing MPSKs`, String(error))
        },
        onSettled: () => {
            void invalidate()
        },
    })
}

function MpskTableRow({
    isCreateOrUpdate,
    name: serverName,
    serverValue,
}: {
    isCreateOrUpdate: "create" | "update"
    name?: Name
    serverValue: Partial<CallingStationIdAuthentication>
}): JSX.Element {
    const [name, setName] = useState<string>(serverName ?? "")
    const isNameModified = useMemo(() => name !== (serverName ?? ""), [serverName, name])

    const [callingStationId, setCallingStationId] = useState<string>(serverValue.callingStationId ?? "")
    const isCallingStationIdModified = useMemo(
        () => callingStationId !== (serverValue.callingStationId ?? ""),
        [serverValue.callingStationId, callingStationId],
    )

    const [psk, setPsk] = useState<string>(serverValue.psk ?? "")
    const isPskModified = useMemo(() => psk !== (serverValue.psk ?? ""), [serverValue.psk, psk])

    const formValidation = useMemo<t.Validation<CallingStationIdAuthentication>>(
        () => MPSKType.decode({ callingStationId, name, psk }),
        [name, callingStationId, psk],
    )
    const formError = useMemo(
        () =>
            F.pipe(
                formValidation,
                E.mapLeft((errors) => PR.failure(errors).join("\n")),
                E.fold(
                    (error) => error,
                    () => "",
                ),
            ),
        [formValidation],
    )

    const { mutate: submitUpdate, isLoading: isUpdating } = useUpdateMpsk({
        name: serverName ?? "",
        onSuccess: () => {
            if (isCreateOrUpdate === "create") {
                setName(serverName ?? "")
                setCallingStationId(serverValue.callingStationId ?? "")
                setPsk(serverValue.psk ?? "")
            }
        },
    })
    const { mutate: submitDelete } = useDeleteMpsk(name)

    useEffect(() => {
        setName(serverName ?? "")
        setCallingStationId(serverValue.callingStationId ?? "")
        setPsk(serverValue.psk ?? "")
    }, [serverName, serverValue.callingStationId, serverValue.psk])

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
                isModified={isCallingStationIdModified}
                onChange={setCallingStationId}
                validate={(value) => CallingStationIdType.decode(value)}
                value={callingStationId}
            />
            <ValidatedTableCell
                isModified={isPskModified}
                onChange={setPsk}
                validate={(value) => PSKType.decode(value)}
                value={psk}
            />

            {isCreateOrUpdate === "create" && (
                <TableCell>
                    <Tooltip title={formError}>
                        <span>
                            <IconButton
                                aria-label="Create"
                                disabled={E.isLeft(formValidation)}
                                onClick={() => {
                                    submitUpdate(formValidation)
                                }}
                            >
                                <Add />
                            </IconButton>
                        </span>
                    </Tooltip>
                </TableCell>
            )}

            {isCreateOrUpdate === "update" && (
                <TableCell>
                    <Tooltip title={formError}>
                        <span>
                            <IconButton
                                aria-label="Update"
                                disabled={E.isLeft(formValidation) || isUpdating}
                                onClick={() => {
                                    submitUpdate(formValidation)
                                }}
                            >
                                <Save />
                            </IconButton>
                        </span>
                    </Tooltip>
                    <IconButton
                        aria-label="Delete"
                        onClick={() => {
                            submitDelete()
                        }}
                    >
                        <Delete />
                    </IconButton>
                </TableCell>
            )}
        </TableRow>
    )
}

function MpskTable(): JSX.Element {
    const { data: mpsks, isLoading } = useListMpsks()
    const { mutate: importMpsks } = useBulkCreateOrUpdateMpsks()

    const tableItems = useMemo(() => {
        if (mpsks === undefined) {
            return []
        }
        return mpsks.map((mpsk) => (
            <MpskTableRow serverValue={mpsk} isCreateOrUpdate="update" key={mpsk.name} name={mpsk.name} />
        ))
    }, [mpsks])

    return (
        <>
            {isLoading && <LinearProgress />}
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Calling Station ID</TableCell>
                            <TableCell>PSK</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tableItems}
                        <MpskTableRow serverValue={{}} isCreateOrUpdate="create" key="create" />
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={4}>
                                <ExportButton
                                    data={mpsks ?? []}
                                    encoder={ListMPSKsResponseType}
                                    filename="mpsks.json"
                                />
                                <ImportButton
                                    decoder={BulkCreateOrUpdateMPSKsRequestType}
                                    onImport={(mpsks) => {
                                        importMpsks(mpsks)
                                    }}
                                />
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
        </>
    )
}

export default function MpskDashboardPage() {
    return (
        <div>
            <MpskTable />
        </div>
    )
}
