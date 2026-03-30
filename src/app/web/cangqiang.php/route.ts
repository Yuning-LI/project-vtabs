import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function createResponse() {
  return NextResponse.json({
    errCode: 0,
    errMsg: '',
    result: {}
  })
}

export async function GET() {
  return createResponse()
}

export async function POST() {
  return createResponse()
}
