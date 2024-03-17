"use client"

import { CheckCircle, Dangerous, Delete, DeleteForever, Download, ExpandMore } from "@mui/icons-material"
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    CircularProgress,
    Divider,
    Grid,
    LinearProgress,
    Popover,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material"
import {
    CertificateSummary,
    CreateCertificateRequest,
    CreateCertificateRequestType,
    GetPkiSummaryResponse,
} from "@yonagi/common/api/pki"
import { PositiveIntegerFromString } from "@yonagi/common/types/Integers"
import { NonEmptyStringType } from "@yonagi/common/types/StringWithLengthRange"
import { RelativeDistinguishedNames } from "@yonagi/common/types/pki/RelativeDistinguishedNames"
import { SerialNumberString } from "@yonagi/common/types/pki/SerialNumberString"
import { useState } from "react"
import { useMutation, useQuery } from "react-query"

import {
    createCertificateAuthority,
    createClientCertificate,
    createServerCertificate,
    deleteCertificateAuthority,
    deleteClientCertificate,
    deleteServerCertificate,
    exportCertificateAuthorityPem,
    exportClientCertificateP12,
    getPkiSummary,
} from "./actions"
import { base64ToBlob, downloadBlob, useNonce, useQueryHelpers } from "../../lib/client"
import { ValidatedForm, ValidatedTextField } from "../../lib/forms"
import { useNotifications } from "../../lib/notifications"

const PKI_QUERY_KEY = ["pki", "summary"]

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

function CertificateDisplayAccordionDetails({
    canExportCaPem,
    canExportP12,
    cert,
    delete: submitDelete,
}: {
    canExportCaPem?: boolean
    canExportP12?: boolean
    cert: CertificateSummary
    delete: (serial: SerialNumberString) => Promise<unknown>
}) {
    const { invalidate } = useQueryHelpers(PKI_QUERY_KEY)
    const { isLoading: isDeleting, mutate: mutateDelete } = useMutation({
        mutationFn: async () => await submitDelete(cert.serialNumber),
        mutationKey: ["pki", "delete", cert.serialNumber],
        onSettled: invalidate,
    })
    const { notifyError } = useNotifications()

    const { isLoading: isExportingP12, refetch: refetchP12 } = useQuery({
        enabled: false,
        queryFn: async () => {
            const base64 = await exportClientCertificateP12(cert.serialNumber, "neko")
            const blob = base64ToBlob(base64, "application/x-pkcs12")
            downloadBlob(blob, `${cert.serialNumber}.p12`)
        },
        onError: (error) => {
            notifyError("Failed to export PKCS#12", String(error))
        },
        queryKey: ["pki", "download", cert.serialNumber],
        retry: false,
    })

    const { isLoading: isExportingCaPem, refetch: refetchCaPem } = useQuery({
        enabled: false,
        queryFn: async () => {
            const pem = await exportCertificateAuthorityPem()
            const blob = new Blob([pem], { type: "application/x-pem-file" })
            downloadBlob(blob, `${cert.serialNumber}.crt`)
        },
        onError: (error) => {
            notifyError("Failed to download certificate", String(error))
        },
        queryKey: ["pki", "download", cert.serialNumber],
        retry: false,
    })

    const [deletePopoverAnchor, setDeletePopoverAnchor] = useState<HTMLElement | null>(null)

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
                    <Button
                        color="error"
                        disabled={deletePopoverAnchor !== null || isDeleting}
                        onClick={(e) => {
                            setDeletePopoverAnchor(e.currentTarget)
                        }}
                        startIcon={isDeleting ? <CircularProgress /> : <DeleteForever />}
                        variant="contained"
                    >
                        Delete
                    </Button>
                    {canExportCaPem && (
                        <Button
                            color="primary"
                            disabled={isExportingCaPem}
                            onClick={() => {
                                refetchCaPem().catch(() => {
                                    /* */
                                })
                            }}
                            startIcon={isExportingCaPem ? <CircularProgress size="1em" /> : <Download />}
                            variant="contained"
                        >
                            Certificate
                        </Button>
                    )}
                    {canExportP12 && (
                        <Button
                            color="primary"
                            disabled={isExportingP12}
                            onClick={() => {
                                refetchP12().catch(() => {
                                    /* */
                                })
                            }}
                            startIcon={isExportingP12 ? <CircularProgress size="1em" /> : <Download />}
                            variant="contained"
                        >
                            Download
                        </Button>
                    )}
                </Stack>
            </Stack>
            <Popover
                anchorEl={deletePopoverAnchor}
                anchorOrigin={{
                    horizontal: "left",
                    vertical: "center",
                }}
                elevation={2}
                onClose={() => {
                    setDeletePopoverAnchor(null)
                }}
                open={deletePopoverAnchor !== null}
                transformOrigin={{
                    horizontal: "left",
                    vertical: "center",
                }}
            >
                <Button
                    color="error"
                    onClick={() => {
                        setDeletePopoverAnchor(null)
                        mutateDelete()
                    }}
                    startIcon={<Delete />}
                    variant="contained"
                >
                    Confirm Delete
                </Button>
            </Popover>
        </AccordionDetails>
    )
}

function CertificateCreateAccordionDetails({
    create: submitCreate,
}: {
    create: (form: CreateCertificateRequest) => Promise<unknown>
}) {
    const { invalidate } = useQueryHelpers(PKI_QUERY_KEY)
    const { isLoading: isCreating, mutate: mutateCreate } = useMutation<unknown, unknown, CreateCertificateRequest>({
        mutationFn: async (form) => await submitCreate(form),
        mutationKey: ["pki", "create"],
        onSettled: invalidate,
    })
    return (
        <AccordionDetails>
            <ValidatedForm
                decoder={CreateCertificateRequestType}
                submit={(form) => {
                    mutateCreate(form)
                }}
            >
                {(update, trySubmit) => (
                    <Stack direction="column" gap={2}>
                        <ValidatedTextField
                            decoder={NonEmptyStringType}
                            initialValue=""
                            label="Common Name"
                            onChange={(commonName) => {
                                update((current) => ({
                                    ...current,
                                    subject: { ...current.subject, commonName },
                                }))
                            }}
                        />
                        <ValidatedTextField
                            decoder={NonEmptyStringType}
                            initialValue=""
                            label="Organization Name"
                            onChange={(organizationName) => {
                                update((current) => ({
                                    ...current,
                                    subject: { ...current.subject, organizationName },
                                }))
                            }}
                        />
                        <ValidatedTextField
                            decoder={PositiveIntegerFromString}
                            initialValue=""
                            label="Valid Days"
                            onChange={(validity) => {
                                update((current) => ({ ...current, validity }))
                            }}
                        />
                        <Box>
                            <Button
                                color="success"
                                disabled={isCreating}
                                onClick={() => {
                                    trySubmit()
                                }}
                                startIcon={isCreating ? <CircularProgress /> : <DeleteForever />}
                                variant="contained"
                            >
                                Create
                            </Button>
                        </Box>
                    </Stack>
                )}
            </ValidatedForm>
        </AccordionDetails>
    )
}

function CertificateAccordion(
    props: {
        create?: (form: CreateCertificateRequest) => Promise<unknown>
        defaultExpanded?: boolean
        isLoading: boolean
        key?: string
        title: string
    } & (
        | {
              canExportCaPem?: boolean
              canExportP12?: boolean
              cert?: CertificateSummary
              delete: (serial: SerialNumberString) => Promise<unknown>
          }
        | {
              cert?: never
          }
    ),
) {
    const { defaultExpanded, isLoading, title } = props
    return (
        <Accordion defaultExpanded={defaultExpanded} disabled={isLoading}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography aria-label="Certificate Type">{title}</Typography>
                    {props.cert && (
                        <Typography
                            aria-label="Certificate Subject Common Name"
                            sx={{ color: "text.secondary", flexGrow: 2 }}
                        >
                            {props.cert.subject.commonName}
                        </Typography>
                    )}
                </Stack>
            </AccordionSummary>
            {props.isLoading ? (
                <AccordionDetails>
                    <LinearProgress />
                </AccordionDetails>
            ) : props.cert ? (
                <CertificateDisplayAccordionDetails
                    cert={props.cert}
                    delete={(serial) => props.delete(serial)}
                    canExportCaPem={props.canExportCaPem}
                    canExportP12={props.canExportP12}
                />
            ) : props.create ? (
                <CertificateCreateAccordionDetails create={props.create} />
            ) : (
                <></>
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
    const { data, status } = useQuery<GetPkiSummaryResponse>({
        queryFn: async () => await getPkiSummary(),
        queryKey: ["pki", "summary"],
    })
    const hasData = status === "success"
    const { nonce, increaseNonce } = useNonce()

    return (
        <Stack gap={2}>
            <Box>
                <DashboardSectionTitle>Infrastructure</DashboardSectionTitle>
                <CertificateAccordion
                    canExportCaPem
                    cert={data?.ca}
                    create={(form) => createCertificateAuthority(form).finally(increaseNonce)}
                    defaultExpanded
                    delete={(serial) => deleteCertificateAuthority(serial)}
                    isLoading={!hasData}
                    key={`ca-${nonce}`}
                    title="Certificate Authority"
                />
                <CertificateAccordion
                    cert={data?.server}
                    create={(form) => createServerCertificate(form).finally(increaseNonce)}
                    defaultExpanded
                    delete={(serial) => deleteServerCertificate(serial)}
                    isLoading={!hasData}
                    key={`server-${nonce}`}
                    title="Server Certificate"
                />
            </Box>
            <Box>
                <DashboardSectionTitle>Clients</DashboardSectionTitle>
                {data?.clients?.map((clientCert) => (
                    <CertificateAccordion
                        cert={clientCert}
                        delete={(serial) => deleteClientCertificate(serial)}
                        canExportP12
                        isLoading={!hasData}
                        key={clientCert.serialNumber}
                        title="Client"
                    />
                ))}
            </Box>
            <Box>
                <CertificateAccordion
                    create={(form) => createClientCertificate(form).finally(increaseNonce)}
                    defaultExpanded
                    isLoading={!hasData}
                    key={`create-client-${nonce}`}
                    title="New Client"
                />
            </Box>
        </Stack>
    )
}
