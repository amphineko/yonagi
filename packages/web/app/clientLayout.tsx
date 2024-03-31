"use client"

import {
    AccountBox,
    BugReport,
    Error,
    LinkOff,
    Lock,
    Notes,
    Password,
    PowerSettingsNew,
    Refresh,
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
import { FC, JSX, PropsWithChildren, ReactNode, useEffect, useMemo, useState } from "react"
import { QueryClient, QueryClientProvider } from "react-query"

import { useRadiusdStatus, useReloadRadiusd, useRestartRadiusd } from "./queries"
import { NotificationList, NotificationProvider } from "../lib/notifications"

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

function RadiusdMenu(): JSX.Element {
    const { trigger: reload } = useReloadRadiusd()
    const { trigger: restart } = useRestartRadiusd()

    return (
        <Box>
            <IconButton
                color="inherit"
                onClick={() => {
                    void reload()
                }}
            >
                <Tooltip title="Reload">
                    <Refresh />
                </Tooltip>
            </IconButton>

            <IconButton
                color="inherit"
                onClick={() => {
                    void restart()
                }}
            >
                <Tooltip title="Restart">
                    <PowerSettingsNew />
                </Tooltip>
            </IconButton>
        </Box>
    )
}

function StatusChip(): JSX.Element {
    const { data: status } = useRadiusdStatus()

    const isRunning = status?.lastExitCode === undefined

    const [now, setNow] = useState(() => Date.now())
    const uptime = Math.floor(((status?.lastRestartedAt?.getTime() ?? now) - now) / 1000)

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(Date.now())
        }, 1000)

        return () => {
            clearInterval(interval)
        }
    }, [])

    return status === undefined ? (
        <Tooltip title={`Cannot fetch server status`}>
            <Chip color="error" icon={<LinkOff />} label="Unknown" variant="outlined" />
        </Tooltip>
    ) : isRunning ? (
        <Tooltip title={`Radiusd is up since ${status.lastRestartedAt?.toLocaleString()}`}>
            <Chip color="success" icon={<Traffic />} label={humanize(uptime)} variant="outlined"></Chip>
        </Tooltip>
    ) : (
        <Tooltip title={`Exited with code ${status.lastExitCode}`}>
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

function ProviderReducer({ children, providers }: PropsWithChildren<{ providers: FC<PropsWithChildren>[] }>) {
    return providers.reduce((children, Provider) => {
        return <Provider>{children}</Provider>
    }, children)
}

export function RootClientLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const pathname = usePathname()
    const router = useRouter()

    const tabs: Record<string, { label: string; icon: SvgIconComponent; hidden?: boolean }> = useMemo(
        () => ({
            "/radiusd/logs": { label: "radiusd.log", icon: Notes },
            "/clients": { label: "NAS Clients", icon: WifiPassword },
            "/mpsks": { label: "Device MPSKs", icon: Password },
            "/pki": { label: "PKI", icon: Lock },
            "/users": { label: "Users", icon: AccountBox },
            "/debug": { label: "Debug", icon: BugReport, hidden: true },
        }),
        [],
    )
    const currentTab = Object.keys(tabs).find((key) => pathname.startsWith(key)) ?? ""

    const tabNodes = useMemo(
        () =>
            Array.from(Object.entries(tabs)).map(([href, { label, hidden, icon }]) =>
                href === currentTab || !hidden ? (
                    <Box key={href} sx={{ flexGrow: 0 }}>
                        <TabButton href={href} icon={icon} isSelected={href === currentTab} label={label} />
                    </Box>
                ) : null,
            ),
        [currentTab, tabs],
    )

    useEffect(() => {
        const defaultTab = Object.keys(tabs).shift()
        if (currentTab === "" && defaultTab) {
            router.push(defaultTab)
        }
    })

    return (
        <ProviderReducer
            providers={[
                ({ children }) => <NotificationProvider>{children}</NotificationProvider>,
                ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
                ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
            ]}
        >
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
                            <RadiusdMenu />
                        </FlexBox>
                    </Toolbar>
                </AppBar>
                <Box>{children}</Box>
            </Stack>
            <NotificationList />
        </ProviderReducer>
    )
}
