"use client"

import { Lock, Notes, Password, Refresh, SvgIconComponent, WifiPassword } from "@mui/icons-material"
import { AppBar, Box, Button, Stack, Toolbar, Tooltip, Typography } from "@mui/material"
import CssBaseline from "@mui/material/CssBaseline"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ReactNode, useEffect, useMemo } from "react"
import { QueryClient, QueryClientProvider, useMutation } from "react-query"

import { reload as doReload } from "./actions"

const queryClient = new QueryClient()

function ReloadButton(): JSX.Element {
    const { mutate: reload } = useMutation({
        mutationFn: doReload,
        mutationKey: ["index", "radiusd", "reload"],
    })

    return (
        <Button
            color="inherit"
            onClick={() => {
                reload()
            }}
        >
            <Tooltip title="Reload">
                <Refresh />
            </Tooltip>
        </Button>
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
                            <Box key="site-title" sx={{ display: "flex", flexGrow: 1, justifyContent: "end" }}>
                                <SiteTitle>yonagi-web</SiteTitle>
                            </Box>
                            <Box key="reload" sx={{ flexGrow: 0 }}>
                                <ReloadButton />
                            </Box>
                        </Toolbar>
                    </AppBar>
                    <Box>{children}</Box>
                </Stack>
            </ThemeProvider>
        </QueryClientProvider>
    )
}
