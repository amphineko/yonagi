import * as t from "io-ts"

import { RadiusUserPasswordStatusType, RadiusUserPasswords, RadiusUserType } from "../types/users/RadiusUser"

export const CreateOrUpdateUserRequestType = t.partial({})

export type CreateOrUpdateUserRequest = t.TypeOf<typeof CreateOrUpdateUserRequestType>

export const ListUserResponseType = t.readonlyArray(RadiusUserType)

export type ListUserResponse = t.TypeOf<typeof ListUserResponseType>

export const ListUserPasswordStatusResponseType = t.readonlyArray(RadiusUserPasswordStatusType)

export const UpdateUserPasswordsRequestType: t.Type<Partial<RadiusUserPasswords>> = t.partial({
    clearText: t.union([t.string, t.null]),
    ntHash: t.union([t.string, t.null]),
    ssha: t.union([t.string, t.null]),
    ssha512: t.union([t.string, t.null]),
})

export type UpdateUserPasswordsRequest = t.TypeOf<typeof UpdateUserPasswordsRequestType>
