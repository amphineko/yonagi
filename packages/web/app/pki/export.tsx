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
import useSWRMutation from "swr/mutation"

import { exportCertificateAuthorityPem, exportClientCertificateP12 } from "./actions"
import { base64ToBlob, downloadBlob } from "../../lib/client"
import { useNotifications } from "../../lib/notifications"

export function useExportCertificateAuthorityPem(filename: string) {
    return useSWRMutation(["pki"], async () => {
        const pem = await exportCertificateAuthorityPem()
        const blob = new Blob([pem], { type: "application/x-pem-file" })
        downloadBlob(blob, `${filename}.crt`)
    })
}

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

    const { notifyError, notifySuccess } = useNotifications()
    const { trigger, isMutating } = useSWRMutation(
        ["pki"],
        async (_, { arg: password }: { arg: string }) => {
            const base64 = await exportClientCertificateP12(serialNumber, password)
            const blob = base64ToBlob(base64, "application/x-pkcs12")
            downloadBlob(blob, `${serialNumber}.p12`)
        },
        {
            onError: (error) => {
                notifyError("Failed to export PKCS#12", String(error))
            },
            onSuccess: () => {
                notifySuccess("PKCS#12 exported")
                onClose()
            },
        },
    )

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
                    void trigger(password)
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
                    disabled={isMutating || password.length === 0}
                    startIcon={isMutating ? <CircularProgress size="1em" /> : <FileDownload />}
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
