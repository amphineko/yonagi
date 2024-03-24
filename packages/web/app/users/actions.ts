"use server"

import {
    CreateOrUpdateUserRequestType,
    ListUserPasswordStatusResponseType,
    ListUserResponse,
    ListUserResponseType,
    UpdateUserPasswordsRequest,
    UpdateUserPasswordsRequestType,
} from "@yonagi/common/api/users"
import { RadiusUserPasswordStatus } from "@yonagi/common/types/users/RadiusUser"
import { Username } from "@yonagi/common/types/users/Username"
import * as t from "io-ts"

import { deleteEndpoint, getTypedEndpoint, postTypedEndpoint } from "../../lib/actions"

export async function createUser(username: string): Promise<void> {
    await postTypedEndpoint(t.unknown, CreateOrUpdateUserRequestType, `api/v1/users/${username}`, {})
}

export async function deleteUser(username: string): Promise<void> {
    await deleteEndpoint(`api/v1/users/${username}`)
}

export async function listUsers(): Promise<ListUserResponse> {
    return await getTypedEndpoint(ListUserResponseType, "api/v1/users")
}

export async function listUserPasswords(): Promise<readonly RadiusUserPasswordStatus[]> {
    return await getTypedEndpoint(ListUserPasswordStatusResponseType, "api/v1/passwords")
}

export async function updateUserPasswords(username: Username, passwords: UpdateUserPasswordsRequest): Promise<void> {
    await postTypedEndpoint(t.unknown, UpdateUserPasswordsRequestType, `api/v1/passwords/${username}`, {
        ...passwords,
        username,
    })
}
