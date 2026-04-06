import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  method: 'GET' | 'POST'
) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('scrims_token')?.value

  const upstream = await fetch(`${API_URL}/scrims/scrims/${id}/result`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(method === 'POST' ? { body: await req.text() } : {}),
  })

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handler(req, ctx, 'GET')
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handler(req, ctx, 'POST')
}
