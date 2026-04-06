import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('scrims_token')?.value

  const { searchParams } = new URL(req.url)
  const query = searchParams.toString()
  const upstreamUrl = `${API_URL}/scrims/scrims/${id}/messages${query ? `?${query}` : ''}`

  const upstream = await fetch(upstreamUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
