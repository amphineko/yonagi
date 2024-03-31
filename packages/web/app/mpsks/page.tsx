"use client"

import { Add, Delete, Download, Save, Upload } from "@mui/icons-material"
import {
    Button,
    IconButton,
    LinearProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableFooter,
    TableHead,
    TableRow,
    TextField,
} from "@mui/material"
import { ListMPSKsResponseType } from "@yonagi/common/api/mpsks"
import { Name, NameType } from "@yonagi/common/types/Name"
import { CallingStationId, CallingStationIdType } from "@yonagi/common/types/mpsks/CallingStationId"
import { CallingStationIdAuthentication } from "@yonagi/common/types/mpsks/MPSK"
import { PSK, PSKType } from "@yonagi/common/types/mpsks/PSK"
import * as E from "fp-ts/lib/Either"
import * as F from "fp-ts/lib/function"
import * as t from "io-ts/lib/index"
import { ComponentProps, Key, useEffect, useMemo, useState } from "react"

import { useDeleteMpsk, useImportMpsks, useMpsks, useUpdateMpsk } from "./queries"
import { useNonce } from "../../lib/client"
import { CodecTextField } from "../../lib/forms"
import { useNotifications } from "../../lib/notifications"
import { useExportDownload, useImportUpload } from "../../lib/upload"

interface MpskTableRowValidations {
    name: t.Validation<Name>
    callingStationId: t.Validation<CallingStationId>
    psk: t.Validation<PSK>
}

function MpskTableRow({
    actions,
    serverValues,
    onChange,
    onKeyDown,
}: {
    actions: React.ReactNode
    key?: React.Key
    serverValues?: CallingStationIdAuthentication
    onChange: (validations: MpskTableRowValidations) => void
    onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void
}): JSX.Element {
    /**
     * states of **latest validations** of each field
     * new values are updated to the input fields, and only their validations will be propagated here
     */
    const [name, setName] = useState(serverValues ? t.success(serverValues.name) : NameType.decode(""))
    const [callingStationId, setCallingStationId] = useState(
        serverValues ? t.success(serverValues.callingStationId) : CallingStationIdType.decode(""),
    )
    const [psk, setPsk] = useState(serverValues ? t.success(serverValues.psk) : PSKType.decode(""))

    const textFieldProps: ComponentProps<typeof TextField> = {
        variant: "standard",
    }

    useEffect(() => {
        // propagates the latest validations to the parent component
        onChange({ name, callingStationId, psk })
    }, [name, callingStationId, psk, onChange])

    return (
        <TableRow onKeyDown={onKeyDown}>
            <TableCell>
                <CodecTextField
                    codec={NameType}
                    initialValue={serverValues?.name ?? ""}
                    onChange={setName}
                    textFieldProps={textFieldProps}
                />
            </TableCell>
            <TableCell>
                <CodecTextField
                    codec={CallingStationIdType}
                    initialValue={serverValues ? CallingStationIdType.encode(serverValues.callingStationId) : ""}
                    onChange={setCallingStationId}
                    textFieldProps={textFieldProps}
                />
            </TableCell>
            <TableCell>
                <CodecTextField
                    codec={PSKType}
                    initialValue={serverValues ? PSKType.encode(serverValues.psk) : ""}
                    onChange={setPsk}
                    textFieldProps={textFieldProps}
                />
            </TableCell>
            <TableCell>{actions}</TableCell>
        </TableRow>
    )
}

function useMpskValidatedSubmit(submit: (mpsk: CallingStationIdAuthentication) => void) {
    const [validations, setValidations] = useState<MpskTableRowValidations | null>(null)

    const handleSubmit = () => {
        if (validations === null) {
            return
        }

        F.pipe(
            E.Do,
            E.bind("name", () => validations.name),
            E.bind("callingStationId", () => validations.callingStationId),
            E.bind("psk", () => validations.psk),
            E.map((mpsk) => {
                submit(mpsk)
            }),
        )
    }

    return { handleSubmit, setValidations }
}

function CreateMpskTableRow() {
    const { trigger: create } = useUpdateMpsk()
    const { handleSubmit, setValidations } = useMpskValidatedSubmit((mpsk) => {
        void create(mpsk)
    })

    return (
        <MpskTableRow
            actions={
                <IconButton aria-label="Submit MPSK creation" onClick={handleSubmit}>
                    <Add />
                </IconButton>
            }
            onChange={setValidations}
            onKeyDown={(e) => {
                e.key === "Enter" && handleSubmit()
            }}
        />
    )
}

function UpdateMpskTableRow({ mpsk }: { mpsk: CallingStationIdAuthentication; key: Key }) {
    const { trigger: updateMpsk } = useUpdateMpsk()
    const { trigger: deleteMpsk } = useDeleteMpsk()
    const { handleSubmit, setValidations } = useMpskValidatedSubmit((mpsk) => {
        void updateMpsk(mpsk)
    })

    return (
        <MpskTableRow
            actions={
                <>
                    <IconButton aria-label="Submit MPSK update" onClick={handleSubmit}>
                        <Save />
                    </IconButton>
                    <IconButton
                        aria-label="Delete this MPSK"
                        onClick={() => {
                            void deleteMpsk(mpsk.name)
                        }}
                    >
                        <Delete />
                    </IconButton>
                </>
            }
            onChange={setValidations}
            onKeyDown={(e) => {
                e.key === "Enter" && handleSubmit()
            }}
            serverValues={mpsk}
        />
    )
}

function MpskTable(): JSX.Element {
    const { data: mpsks, isLoading } = useMpsks()
    const { trigger: importMpsks } = useImportMpsks()

    const { notifyError } = useNotifications()

    const { download } = useExportDownload("mpsks.json", ListMPSKsResponseType)
    const { upload } = useImportUpload(
        ListMPSKsResponseType,
        (mpsks) => {
            void importMpsks(mpsks)
        },
        (error) => {
            notifyError(`Error during uploading MPSKs`, String(error))
        },
    )

    const tableItems = useMemo(() => {
        if (mpsks === undefined) {
            return []
        }
        return mpsks.map((mpsk) => <UpdateMpskTableRow mpsk={mpsk} key={mpsk.name} />)
    }, [mpsks])

    const { nonce: createRowKey, increaseNonce: increaseCreateRowKey } = useNonce()
    useEffect(() => {
        increaseCreateRowKey()
    }, [mpsks, increaseCreateRowKey])

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
                        <CreateMpskTableRow key={createRowKey} />
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={4}>
                                <Button
                                    aria-label="Export all MPSKs"
                                    startIcon={<Download />}
                                    onClick={() => {
                                        if (!!mpsks && mpsks.length > 0) {
                                            download(mpsks)
                                        } else {
                                            notifyError("No MPSKs to export")
                                        }
                                    }}
                                >
                                    Export
                                </Button>
                                <Button aria-label="Import MPSKs" startIcon={<Upload />} onClick={upload}>
                                    Import
                                </Button>
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
