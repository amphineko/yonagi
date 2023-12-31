"use client"

import { CheckCircle, Dangerous, ExpandMore } from "@mui/icons-material"
import { Accordion, AccordionDetails, AccordionSummary, Box, Grid, Stack, Tooltip, Typography } from "@mui/material"
import { CertificateSummary } from "@yonagi/common/api/pki"
import { RelativeDistinguishedNames } from "@yonagi/common/pki"
import { useQuery } from "react-query"

import { getPkiSummary } from "./actions"

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
            <Typography sx={{ color: "text.secondary", display: "inline-block" }}>, O={organizationName}</Typography>
        </Typography>
    )
}

function CertificateDetailCell({ children, label }: { children: React.ReactNode; label: string }) {
    return (
        <Grid item xs={12} md={6}>
            <Typography variant="caption">{label}</Typography>
            <Typography noWrap>{children}</Typography>
        </Grid>
    )
}

function CertificateAccordion({
    cert,
    defaultExpanded,
    title,
}: {
    cert?: CertificateSummary
    defaultExpanded?: boolean
    key?: string
    title: string
}) {
    return (
        <Accordion defaultExpanded={defaultExpanded}>
            <AccordionSummary expandIcon={<ExpandMore />}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography aria-label="Certificate Type">{title}</Typography>
                    <Typography
                        aria-label="Certificate Subject Common Name"
                        sx={{ color: "text.secondary", flexGrow: 2 }}
                    >
                        {cert?.subject.commonName}
                    </Typography>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                {cert !== undefined ? (
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
                        <CertificateDetailCell label="Serial Number">
                            <Typography noWrap>{cert.hexSerialNumber}</Typography>
                        </CertificateDetailCell>
                        <CertificateDetailCell label="Signature">
                            <Typography noWrap>{cert.signature}</Typography>
                        </CertificateDetailCell>
                    </Grid>
                ) : (
                    <Typography>No certificate found.</Typography>
                )}
            </AccordionDetails>
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
    const { data } = useQuery({
        queryFn: async () => await getPkiSummary(),
        queryKey: ["pki", "summary"],
    })
    return (
        <Stack gap={2}>
            <Box>
                <DashboardSectionTitle>Infrastructure</DashboardSectionTitle>
                <CertificateAccordion cert={data?.ca} defaultExpanded title="Certificate Authority" />
                <CertificateAccordion cert={data?.server} defaultExpanded title="Server Certificate" />
            </Box>
            <Box>
                <DashboardSectionTitle>Clients</DashboardSectionTitle>
                {data?.clients?.map((clientCert) => (
                    <CertificateAccordion cert={clientCert} key={clientCert.hexSerialNumber} title="Client" />
                ))}
            </Box>
        </Stack>
    )
}
