"use client"

import { FileDownload } from "@mui/icons-material"
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from "@mui/material"
import { SerialNumberString } from "@yonagi/common/types/pki/SerialNumberString"
import { FormEvent, useState } from "react"
import { useQuery } from "react-query"

import { exportClientCertificateP12 } from "./actions"
import { base64ToBlob, downloadBlob } from "../../lib/client"
import { useNotifications } from "../../lib/notifications"

export function ExportPkcs12Dialog({
    onClose,
    open,
    serialNumber,
}: {
    onClose: () => void
    open: boolean
    serialNumber: SerialNumberString
}): JSX.Element {
    const [password, setPassword] = useState("")

    const { isLoading, refetch } = useQuery<unknown, unknown, { password: string }>({
        enabled: false,
        queryFn: async () => {
            const base64 = await exportClientCertificateP12(serialNumber, password)
            const blob = base64ToBlob(base64, "application/x-pkcs12")
            downloadBlob(blob, `${serialNumber}.p12`)
        },
        onError: (error) => {
            notifyError("Failed to export PKCS#12", String(error))
        },
        queryKey: ["pki", "download", serialNumber],
        retry: false,
    })

    const handleSubmit = () => {
        refetch()
            .then(() => {
                onClose()
            })
            .catch((error) => {
                notifyError("Failed to export as PKCS#12", String(error))
            })
    }

    const { notifyError } = useNotifications()

    return (
        <Dialog
            onClose={onClose}
            open={open}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                component: "form",
                onSubmit: (e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault()
                    handleSubmit()
                },
            }}
        >
            <DialogTitle>Export PKCS#12</DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Password"
                        onChange={(e) => {
                            setPassword(e.currentTarget.value)
                        }}
                        required
                        type="password"
                        value={password}
                        variant="filled"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button
                    disabled={isLoading || password.length === 0}
                    onClick={() => {
                        handleSubmit()
                    }}
                    startIcon={isLoading ? <CircularProgress size="1em" /> : <FileDownload />}
                    type="submit"
                >
                    Export
                </Button>
                <Button onClick={onClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    )
}

export function useExportPkcs12Dialog({ serialNumber }: { serialNumber: SerialNumberString }) {
    const [isOpen, setOpen] = useState(false)
    const dialog = ExportPkcs12Dialog({
        onClose: () => {
            setOpen(false)
        },
        open: isOpen,
        serialNumber,
    })

    return {
        dialog,
        open: () => {
            setOpen(true)
        },
    }
}
