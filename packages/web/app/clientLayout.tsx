"use client"

import {
    Error,
    Lock,
    Notes,
    Password,
    Refresh,
    StopCircle,
    SvgIconComponent,
    Traffic,
    WifiPassword,
} from "@mui/icons-material"
import {
    AppBar,
    Box,
    Button,
    Chip,
    IconButton,
    Stack,
    SxProps,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
} from "@mui/material"
import CssBaseline from "@mui/material/CssBaseline"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect, useMemo, useState } from "react"
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "react-query"

import { reload as doReload, getStatus } from "./actions"

const queryClient = new QueryClient()

const humanizer = new Intl.RelativeTimeFormat("en", { numeric: "always", style: "short" })

function humanize(seconds: number) {
    if (seconds > -60) {
        return humanizer.format(seconds, "seconds")
    } else if (seconds > -3600) {
        return humanizer.format(Math.floor(seconds / 60), "minutes")
    } else if (seconds > -86400) {
        return humanizer.format(Math.floor(seconds / 3600), "hours")
    } else {
        return humanizer.format(Math.floor(seconds / 86400), "days")
    }
}

function ReloadButton(): JSX.Element {
    const queryClient = useQueryClient()
    const { mutate: reload } = useMutation({
        mutationFn: doReload,
        mutationKey: ["index", "radiusd", "reload"],
        onSuccess: async () => {
            await queryClient.invalidateQueries(["index", "radiusd", "status"])
        },
    })

    return (
        <IconButton
            color="inherit"
            onClick={() => {
                reload()
            }}
        >
            <Tooltip title="Reload">
                <Refresh />
            </Tooltip>
        </IconButton>
    )
}

function StatusChip(): JSX.Element {
    const { data } = useQuery({
        queryFn: async () => await getStatus(),
        queryKey: ["index", "radiusd", "status"],
        refetchInterval: 60 * 1000,
    })

    const isRunning = data?.lastExitCode === undefined

    const [now, setNow] = useState(() => Date.now())
    const uptime = Math.floor(((data?.lastRestartedAt?.getTime() ?? now) - now) / 1000)

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now())
        }, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [])

    return isRunning ? (
        <Tooltip title={`Radiusd is up since ${data?.lastRestartedAt?.toLocaleString()}`}>
            <Chip color="success" icon={<Traffic />} label={humanize(uptime)} variant="outlined"></Chip>
        </Tooltip>
    ) : data.lastExitCode === 0 ? (
        <Tooltip title={`Exited with code ${data.lastExitCode}`}>
            <Chip color="warning" icon={<StopCircle />} label="Stopped" variant="outlined" />
        </Tooltip>
    ) : (
        <Tooltip title={`Exited with code ${data.lastExitCode}`}>
            <Chip color="error" icon={<Error />} label="Failed" variant="outlined" />
        </Tooltip>
    )
}

function TabButton({
    href,
    icon: IconComponent,
    isSelected,
    label,
}: {
    href: string
    icon: SvgIconComponent
    isSelected: boolean
    label: string
}): JSX.Element {
    return (
        <Link href={href} legacyBehavior passHref>
            <Button
                aria-selected={isSelected}
                role="tab"
                startIcon={<IconComponent />}
                sx={{ color: isSelected ? "text.primary.light" : "text.secondary" }}
                variant={isSelected ? "contained" : "text"}
            >
                {label}
            </Button>
        </Link>
    )
}

function SiteTitle({ children }: { children: ReactNode }): JSX.Element {
    return (
        <Typography color="text.secondary" fontSize="1em" variant="h1">
            {children}
        </Typography>
    )
}

const darkTheme = createTheme({
    palette: {
        mode: "dark",
    },
})

function FlexBox({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }): JSX.Element {
    return <Box sx={{ display: "flex", ...sx }}>{children}</Box>
}

export function RootClientLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const pathname = usePathname()
    const router = useRouter()

    const tabs: Record<string, { label: string; icon: SvgIconComponent }> = useMemo(
        () => ({
            "/radiusd/logs": { label: "radiusd.log", icon: Notes },
            "/clients": { label: "NAS Clients", icon: WifiPassword },
            "/mpsks": { label: "Device MPSKs", icon: Password },
            "/pki": { label: "PKI", icon: Lock },
        }),
        [],
    )
    const currentTab = Object.keys(tabs).find((key) => pathname.startsWith(key)) ?? ""

    const tabNodes = useMemo(
        () =>
            Array.from(Object.entries(tabs)).map(([href, { label, icon }]) => (
                <Box key={href} sx={{ flexGrow: 0 }}>
                    <TabButton href={href} icon={icon} isSelected={href === currentTab} label={label} />
                </Box>
            )),
        [currentTab, tabs],
    )

    useEffect(() => {
        const defaultTab = Object.keys(tabs).pop()
        if (currentTab === "" && defaultTab) {
            router.push(defaultTab)
        }
    })

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={darkTheme}>
                <CssBaseline />
                <Stack spacing={1}>
                    <AppBar color="default" position="sticky">
                        <Toolbar role="navigation" sx={{ gap: "1em" }} variant="dense">
                            {tabNodes}
                            <FlexBox key="title" sx={{ flexGrow: 1, justifyContent: "end" }}>
                                <SiteTitle>yonagi-web</SiteTitle>
                            </FlexBox>
                            <FlexBox key="status" sx={{ alignItems: "center", gap: "0.5em" }}>
                                <StatusChip />
                                <ReloadButton />
                            </FlexBox>
                        </Toolbar>
                    </AppBar>
                    <Box>{children}</Box>
                </Stack>
            </ThemeProvider>
        </QueryClientProvider>
    )
}
