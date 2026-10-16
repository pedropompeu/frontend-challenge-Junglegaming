import {
  ProfileSchema,
  type AvatarBody,
  type ChangePasswordBody,
  type Profile,
  type UpdateProfileBody,
} from '@/contracts'
import { request, send } from '@/shared/lib/http'

export function fetchProfile(signal?: AbortSignal): Promise<Profile> {
  return request(ProfileSchema, { url: '/profile', signal })
}

export function updateProfile(body: UpdateProfileBody): Promise<Profile> {
  return request(ProfileSchema, { method: 'PATCH', url: '/profile', data: body })
}

export function updateAvatar(body: AvatarBody): Promise<Profile> {
  return request(ProfileSchema, { method: 'PUT', url: '/profile/avatar', data: body })
}

export function changePassword(body: ChangePasswordBody): Promise<void> {
  return send({ method: 'POST', url: '/profile/password', data: body })
}
