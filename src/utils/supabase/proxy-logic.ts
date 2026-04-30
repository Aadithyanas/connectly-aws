import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // We have migrated to a custom backend for authentication.
  // The client-side AuthContext and Layout components handle route protection via custom JWTs.
  // This Supabase middleware proxy is disabled to prevent infinite redirect loops.
  return NextResponse.next({
    request: { headers: request.headers },
  })
}
