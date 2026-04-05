import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

const TOKEN_OPTS = {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24,
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const upstream = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await upstream.json()

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status })
  }

  const res = NextResponse.json(data)
  res.cookies.set('scrims_token', data.data.access_token, TOKEN_OPTS)
  return res
}
