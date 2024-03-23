import * as t from "io-ts"

import { Username, UsernameType } from "./Username"

export interface RadiusUser {
    username: Username
}

interface EncodedRadiusUser {
    username: string
}

export const RadiusUserType: t.Type<RadiusUser, EncodedRadiusUser> = t.type({
    username: UsernameType,
})

/**
 * For each password attribute,
 *      string = password hash for this method
 *      null = method is disabled
 */
export interface RadiusUserPasswords {
    username: Username
    clearText: string | null
    ntHash: string | null
    ssha512: string | null
}

interface EncodedRadiusUserPasswords {
    username: string
    clearText: string | null
    ntHash: string | null
    ssha512: string | null
}

export const RadiusUserPasswordsType: t.Type<RadiusUserPasswords, EncodedRadiusUserPasswords> = t.type({
    username: UsernameType,
    clearText: t.union([t.string, t.null]),
    ntHash: t.union([t.string, t.null]),
    ssha512: t.union([t.string, t.null]),
})

/**
 * Indicates whether a user has a password set for each method
 */
export type RadiusUserPasswordStatus = {
    [K in keyof RadiusUserPasswords]: K extends "username" ? Username : boolean
}

type EncodedRadiusUserPasswordStatus = {
    [K in keyof RadiusUserPasswordStatus]: RadiusUserPasswords[K] extends Username ? string : boolean
}

export const RadiusUserPasswordStatusType: t.Type<RadiusUserPasswordStatus, EncodedRadiusUserPasswordStatus> = t.type({
    username: UsernameType,
    clearText: t.boolean,
    ntHash: t.boolean,
    ssha512: t.boolean,
})
