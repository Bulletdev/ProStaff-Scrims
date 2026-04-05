'use client'
import { useEffect, useState } from 'react'
import { getCookie } from '@/lib/cookie'

export function useToken() {
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    setToken(getCookie('scrims_token'))
  }, [])
  return token
}
