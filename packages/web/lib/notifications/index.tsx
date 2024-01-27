"use client"

import { Alert, AlertTitle, SxProps } from "@mui/material"
import { Box } from "@mui/system"
import { createContext, useCallback, useContext, useEffect, useState, useId } from "react"

interface Notification {
    key: unknown
    title: string
    message: string
    severity: "success" | "error"
    timeout: number
}

interface NotificationContext {
    notifications: Notification[]
    addNotification: (notification: Notification) => void
}

const NotificationContext = createContext<NotificationContext>({
    notifications: [],
    addNotification: () => {
        throw new Error("NotificationContext not implemented")
    },
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([])

    const addNotification = useCallback(
        (props: Notification) => {
            setNotifications([...notifications.filter((n) => n.key !== props.key), props])
        },
        [notifications],
    )

    useEffect(() => {
        const timeouts = notifications.map((notification) => {
            return setTimeout(() => {
                setNotifications((notifications) => notifications.filter((n) => n !== notification))
            }, notification.timeout)
        })

        return () => {
            timeouts.forEach((timeout) => {
                clearTimeout(timeout)
            })
        }
    }, [notifications])

    return (
        <NotificationContext.Provider value={{ notifications, addNotification }}>
            {children}
        </NotificationContext.Provider>
    )
}

function Notification({ notification }: { notification: Notification }) {
    return (
        <Alert severity={notification.severity} sx={{ mb: 1 }}>
            <AlertTitle>{notification.title}</AlertTitle>
            {notification.message}
        </Alert>
    )
}

export function NotificationList({ sx }: { sx?: SxProps }) {
    const { notifications } = useContext(NotificationContext)

    return (
        <Box sx={{ position: "relative", right: 0, top: "1em", ...sx }}>
            {notifications.map((notification, i) => (
                <Notification key={i} notification={notification} />
            ))}
        </Box>
    )
}

export function useNotifications(): {
    notifySuccess: (title: string, message: string, key?: unknown) => void
    notifyError: (title: string, message: string, key?: unknown) => void
} {
    const { addNotification } = useContext(NotificationContext)
    const id = useId()

    const notifySuccess = useCallback(
        (title: string, message: string, key?: unknown) => {
            addNotification({
                key: key ?? id,
                title,
                message,
                severity: "success",
                timeout: 5000,
            })
        },
        [addNotification, id],
    )

    const notifyError = useCallback(
        (title: string, message: string, key?: unknown) => {
            addNotification({
                key: key ?? id,
                title,
                message,
                severity: "error",
                timeout: 5000,
            })
        },
        [addNotification, id],
    )

    return { notifySuccess, notifyError }
}
