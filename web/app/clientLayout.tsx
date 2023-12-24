"use client"

import { FluentProvider, Tab, TabList, webLightTheme } from "@fluentui/react-components"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { QueryClient, QueryClientProvider } from "react-query"

const queryClient = new QueryClient()

export function RootClientLayout({ children }: { children: React.ReactNode }): JSX.Element {
    const pathname = usePathname()
    const router = useRouter()

    const tabs = {
        "/clients": "Clients",
        "/mpsks": "MPSKs",
    }
    const currentTab = Object.keys(tabs).find((key) => pathname.startsWith(key)) ?? ""

    const tabNodes = Object.entries(tabs).map(([key, value]) => (
        <Tab key={key} value={key}>
            <Link
                href={key}
                style={{
                    color: "inherit",
                    textDecoration: "none",
                }}
            >
                {value}
            </Link>
        </Tab>
    ))

    return (
        <QueryClientProvider client={queryClient}>
            <FluentProvider theme={webLightTheme}>
                <TabList
                    appearance="subtle"
                    onTabSelect={(e, data) => {
                        router.push(data.value as string)
                    }}
                    selectedValue={currentTab}
                >
                    {tabNodes}
                </TabList>
                {children}
            </FluentProvider>
        </QueryClientProvider>
    )
}
