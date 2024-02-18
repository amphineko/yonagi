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
    exportClientCertificateP12,
    getPkiSummary,
} from "./actions"
import { useNonce, useQueryHelpers } from "../../lib/client"
import { ValidatedForm, ValidatedTextField } from "../../lib/forms"

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
    cert,
    delete: submitDelete,
    downloadable,
}: {
    cert: CertificateSummary
    delete: (serial: SerialNumberString) => Promise<unknown>
    downloadable?: boolean
}) {
    const { invalidate } = useQueryHelpers(PKI_QUERY_KEY)
    const { isLoading: isDeleting, mutate: mutateDelete } = useMutation({
        mutationFn: async () => await submitDelete(cert.hexSerialNumber),
        mutationKey: ["pki", "delete", cert.hexSerialNumber],
        onSettled: invalidate,
    })
    const {
        data,
        error: exportError,
        isLoading: isExporting,
        refetch: download,
    } = useQuery({
        enabled: false,
        queryFn: async () => {
            let blobUrl: string
            if (!data) {
                const base64 = await exportClientCertificateP12(cert.hexSerialNumber, "neko")
                const buffer = Buffer.from(base64, "base64")
                const blob = new Blob([buffer], { type: "application/x-pkcs12" })
                blobUrl = URL.createObjectURL(blob)
            } else {
                blobUrl = data
            }

            const a = document.createElement("a")
            a.href = blobUrl
            a.download = `${cert.hexSerialNumber}.p12`
            a.click()

            return blobUrl
        },
        queryKey: ["pki", "download", cert.hexSerialNumber],
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
                        <DateTime type="notBefore">{cert.validNotBefore}</DateTime>
                    </CertificateDetailCell>
                    <CertificateDetailCell label="Valid Not After">
                        <DateTime type="notAfter">{cert.validNotAfter}</DateTime>
                    </CertificateDetailCell>
                    <CertificateDetailCell label="Serial Number">{cert.hexSerialNumber}</CertificateDetailCell>
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
                    {downloadable && (
                        <Button
                            color="primary"
                            disabled={isExporting}
                            onClick={() => {
                                download().catch(() => {
                                    /* */
                                })
                            }}
                            startIcon={isExporting ? <CircularProgress /> : exportError ? <Dangerous /> : <Download />}
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
              cert?: CertificateSummary
              delete: (serial: SerialNumberString) => Promise<unknown>
              downloadable?: boolean
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
                    downloadable={props.downloadable}
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
                        downloadable
                        isLoading={!hasData}
                        key={clientCert.hexSerialNumber}
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
