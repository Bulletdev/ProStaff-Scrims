import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const upstream = await fetch(`${API_URL}/scrims/lobby?${searchParams.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = await upstream.json()
  return NextResponse.json(data, { status: upstream.status })
}
