'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getCookie } from '@/lib/cookie'
import { Organization } from '@/types'

interface UserMe {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name?: string
  role: string
  discord_user_id?: string | null
  organization?: Organization
}

interface MeResponse {
  data: {
    user: UserMe
    organization?: Organization
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setToken(getCookie('scrims_token'))
  }, [])

  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ['me', token],
    queryFn: () => api.get<MeResponse>('/auth/me', { token: token! }),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  })

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return {
    token,
    user: data?.data?.user ?? null,
    organization: data?.data?.organization ?? null,
    isLoading: !token ? false : isLoading,
    logout,
  }
}
