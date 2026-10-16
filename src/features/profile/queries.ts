import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChangePasswordBody, Profile, SessionInfo, UpdateProfileBody } from '@/contracts'
import { qk } from '@/shared/lib/query-keys'
import * as api from './api'

export function profileQuery(userId: string) {
  return queryOptions({
    queryKey: qk.profile(userId),
    queryFn: ({ signal }) => api.fetchProfile(signal),
  })
}

/** Perfil salvo: atualiza o cache do perfil e o `user` da sessão (nome e avatar do header). */
function useApplyProfile(userId: string) {
  const queryClient = useQueryClient()
  return (profile: Profile) => {
    queryClient.setQueryData(qk.profile(userId), profile)
    queryClient.setQueryData<SessionInfo>(qk.session(), (session) =>
      session?.user.id === userId
        ? {
            ...session,
            user: {
              ...session.user,
              displayName: profile.displayName,
              username: profile.username,
              email: profile.email,
              avatarUrl: profile.avatarUrl,
            },
          }
        : session,
    )
  }
}

export function useUpdateProfile(userId: string) {
  const apply = useApplyProfile(userId)
  return useMutation({
    mutationFn: (body: UpdateProfileBody) => api.updateProfile(body),
    onSuccess: apply,
  })
}

/** `null` remove o avatar. */
export function useUpdateAvatar(userId: string) {
  const apply = useApplyProfile(userId)
  return useMutation({
    mutationFn: (dataUrl: string | null) => api.updateAvatar({ dataUrl }),
    onSuccess: apply,
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (body: ChangePasswordBody) => api.changePassword(body) })
}
