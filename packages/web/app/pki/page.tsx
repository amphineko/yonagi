"use client"

import { CheckCircle, Dangerous, Delete, DeleteForever, Download, ExpandMore } from "@mui/icons-material"
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Divider,
    Grid,
    LinearProgress,
    Popover,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material"
import { CertificateSummary } from "@yonagi/common/api/pki"
import { RelativeDistinguishedNames } from "@yonagi/common/types/pki/RelativeDistinguishedNames"
import { SerialNumberString } from "@yonagi/common/types/pki/SerialNumberString"
import { useEffect, useState } from "react"

import {
    CreateCertificateAuthorityAccordion,
    CreateClientCertificateAccordion,
    CreateServerCertificateAccordion,
} from "./create"
import { useExportCertificateAuthorityPem, useExportPkcs12Dialog } from "./export"
import {
    useDeleteCertificateAuthority,
    useDeleteClientCertificate,
    useDeleteServerCertificate,
    usePkiSummary,
} from "./queries"
import { useNonce } from "../../lib/client"

function DateTime({ children, type }: { children: number; type: "notAfter" | "notBefore" }) {
    const parsed = new Date(children)
    const now = Date.now()
    const isValid = type === "notAfter" ? parsed.getTime() > now : parsed.getTime() < now
    return (
        <>
            <Tooltip title={isValid ? "Valid" : "Expired"}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography> {new Date(children).toLocaleString()}</Typography>
                    {isValid ? (
                        <CheckCircle sx={{ color: "success.main" }} />
                    ) : (
                        <Dangerous sx={{ color: "error.main" }} />
                    )}
                </Stack>
            </Tooltip>
        </>
    )
}

function RDN({ children: { commonName, organizationName } }: { children: RelativeDistinguishedNames }) {
    return (
        <Typography>
            CN={commonName}
            <Typography component="span" sx={{ color: "text.secondary", display: "inline-block" }}>
                , O={organizationName}
            </Typography>
        </Typography>
    )
}

function CertificateDetailCell({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <Grid item xs={12} md={6}>
            <Typography component="div" variant="caption">
                {label}
            </Typography>
            <Typography component="div" noWrap>
                {children}
            </Typography>
        </Grid>
    )
}

function ConfirmDeleteButton({ onClick }: { onClick: () => void }) {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null)

    return (
        <>
            <Button
                color="error"
                onClick={(e) => {
                    setAnchor(e.currentTarget)
                }}
                startIcon={<DeleteForever />}
                variant="contained"
            >
                Delete
            </Button>
            <Popover
                anchorEl={anchor}
                anchorOrigin={{
                    horizontal: "left",
                    vertical: "center",
                }}
                onClose={() => {
                    setAnchor(null)
                }}
                open={!!anchor}
                transformOrigin={{
                    horizontal: "left",
                    vertical: "center",
                }}
            >
                <Button color="error" onClick={onClick} startIcon={<Delete />} variant="contained">
                    Confirm Delete
                </Button>
            </Popover>
        </>
    )
}

function CertificateDisplayAccordionDetails({
    canExportCaPem,
    canExportP12,
    cert,
    onDelete,
}: {
    canExportCaPem?: boolean
    canExportP12?: boolean
    cert: CertificateSummary
    onDelete: (serial: SerialNumberString) => void
}) {
    const { trigger: exportCaPem } = useExportCertificateAuthorityPem(`${cert.serialNumber}.crt`)
    const { dialog: exportPkcs12Dialog, open: openExportPkcs12Dialog } = useExportPkcs12Dialog({
        serialNumber: cert.serialNumber,
    })

    return (
        <AccordionDetails>
            <Stack gap={2}>
                <Grid container spacing={2}>
                    <CertificateDetailCell label="Subject">
                        <RDN>{cert.subject}</RDN>
                    </CertificateDetailCell>
                    <CertificateDetailCell label="Issuer">
                        <RDN>{cert.issuer}</RDN>
                    </CertificateDetailCell>
                    <CertificateDetailCell label="Valid Not Before">
                        <DateTime type="notBefore">{cert.notBefore.getTime()}</DateTime>
                    </CertificateDetailCell>
                    <CertificateDetailCell label="Valid Not After">
                        <DateTime type="notAfter">{cert.notAfter.getTime()}</DateTime>
                    </CertificateDetailCell>
                    <CertificateDetailCell label="Serial Number">{cert.serialNumber}</CertificateDetailCell>
                    <CertificateDetailCell label="Signature">{cert.signature}</CertificateDetailCell>
                </Grid>
                <Divider />
                <Stack direction="row" spacing={1} alignItems="center">
                    <ConfirmDeleteButton
                        onClick={() => {
                            onDelete(cert.serialNumber)
                        }}
                    />
                    {canExportCaPem && (
                        <Button
                            color="primary"
                            onClick={() => void exportCaPem()}
                            startIcon={<Download />}
                            variant="contained"
                        >
                            Certificate
                        </Button>
                    )}
                    {canExportP12 && (
                        <Button
                            color="primary"
                            onClick={() => {
                                openExportPkcs12Dialog()
                            }}
                            startIcon={<Download />}
                            variant="contained"
                        >
                            PKCS#12
                        </Button>
                    )}
                </Stack>
            </Stack>
            {canExportP12 && exportPkcs12Dialog}
        </AccordionDetails>
    )
}

function CertificateAccordion({
    canExportCaPem,
    canExportP12,
    cert,
    defaultExpanded,
    onDelete,
    title,
}: {
    canExportCaPem?: boolean
    canExportP12?: boolean
    cert?: CertificateSummary
    defaultExpanded?: boolean
    onDelete: (serial: SerialNumberString) => unknown
    key?: string
    title: string
}) {
    return (
        <Accordion defaultExpanded={defaultExpanded} disabled={cert === undefined}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography aria-label="Certificate Type">{title}</Typography>
                    {cert && (
                        <Typography
                            aria-label="Common Name of Certificate Subject"
                            sx={{ color: "text.secondary", flexGrow: 2 }}
                        >
                            {cert.subject.commonName}
                        </Typography>
                    )}
                </Stack>
            </AccordionSummary>
            {cert ? (
                <CertificateDisplayAccordionDetails
                    cert={cert}
                    onDelete={(serial) => {
                        onDelete(serial)
                    }}
                    canExportCaPem={canExportCaPem}
                    canExportP12={canExportP12}
                />
            ) : (
                <AccordionDetails>
                    <LinearProgress />
                </AccordionDetails>
            )}
        </Accordion>
    )
}

function DashboardSectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            sx={{ color: "text.secondary", fontSize: "1.2em", paddingInline: "0.75em", marginBlock: "0.75em" }}
            variant="h2"
        >
            {children}
        </Typography>
    )
}

export default function PkiDashboardPage() {
    const { data } = usePkiSummary()
    const { nonce, increaseNonce } = useNonce()

    const { trigger: deleteCertificateAuthority } = useDeleteCertificateAuthority()
    const { trigger: deleteServerCertificate } = useDeleteServerCertificate()
    const { trigger: deleteClientCertificate } = useDeleteClientCertificate()

    useEffect(() => {
        increaseNonce()
    }, [data, increaseNonce])

    return (
        <Stack gap={2}>
            <Box>
                <DashboardSectionTitle>Infrastructure</DashboardSectionTitle>
                {data && data.ca === undefined ? (
                    <CreateCertificateAuthorityAccordion />
                ) : (
                    <CertificateAccordion
                        canExportCaPem
                        cert={data?.ca}
                        defaultExpanded
                        onDelete={(serial) => deleteCertificateAuthority(serial)}
                        key={`ca`}
                        title="Certificate Authority"
                    />
                )}
                {data && data.server === undefined ? (
                    <CreateServerCertificateAccordion />
                ) : (
                    <CertificateAccordion
                        cert={data?.server}
                        defaultExpanded
                        onDelete={(serial) => deleteServerCertificate(serial)}
                        key={`server`}
                        title="Server Certificate"
                    />
                )}
            </Box>
            <Box>
                <DashboardSectionTitle>Clients</DashboardSectionTitle>
                {data?.clients?.map((clientCert) => (
                    <CertificateAccordion
                        cert={clientCert}
                        onDelete={(serial) => deleteClientCertificate(serial)}
                        canExportP12
                        key={clientCert.serialNumber}
                        title="Client"
                    />
                ))}
            </Box>
            <Box>
                <CreateClientCertificateAccordion key={nonce} />
            </Box>
        </Stack>
    )
}
