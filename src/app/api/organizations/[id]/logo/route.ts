import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const token = cookieStore.get('scrims_token')?.value

  // Forward as multipart — pass through body and content-type header
  const formData = await req.formData()
  const upstream = await fetch(`${API_URL}/organizations/${id}/logo`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
