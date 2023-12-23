"use client"

import { FluentProvider, webLightTheme } from "@fluentui/react-components"
import { QueryClient, QueryClientProvider } from "react-query"

const queryClient = new QueryClient()

export function RootClientLayout({ children }: { children: React.ReactNode }): JSX.Element {
    return (
        <QueryClientProvider client={queryClient}>
            <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
        </QueryClientProvider>
    )
}
