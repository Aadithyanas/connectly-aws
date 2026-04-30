import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/chat'

  if (code) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    // Get the preferred role from cookie
    const cookieStore = request.headers.get('cookie')
    const preferredRole = cookieStore?.includes('preferred_role=professional') ? 'professional' : 'student'

    if (!error && user) {
      // Check if profile exists and has a role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single()

      // If no role, assign the preferred role
      if (!profile?.role) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            role: preferredRole,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
            verification_level: 0,
            availability_status: true
          })
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
