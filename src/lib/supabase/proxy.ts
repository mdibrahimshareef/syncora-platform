import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  HEADER_REQUEST_ID,
  HEADER_CORRELATION_ID,
  resolveRequestId,
  resolveCorrelationId,
} from '@/lib/observability/correlation'

export async function updateSession(request: NextRequest) {
  // 1. Resolve and validate request and correlation identifiers
  const incomingReqId = request.headers.get(HEADER_REQUEST_ID)
  const incomingCorrId = request.headers.get(HEADER_CORRELATION_ID)
  const requestId = resolveRequestId(incomingReqId)
  const correlationId = resolveCorrelationId(incomingCorrId, requestId)

  // 2. Prepare request headers to pass forward to Route Handlers & Server Components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(HEADER_REQUEST_ID, requestId)
  requestHeaders.set(HEADER_CORRELATION_ID, correlationId)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  supabaseResponse.headers.set(HEADER_REQUEST_ID, requestId)
  supabaseResponse.headers.set(HEADER_CORRELATION_ID, correlationId)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          supabaseResponse.headers.set(HEADER_REQUEST_ID, requestId)
          supabaseResponse.headers.set(HEADER_CORRELATION_ID, correlationId)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect workspace routes
  const protectedPaths = ['/app', '/onboarding']
  const isProtectedPath = protectedPaths.some((path) => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set(HEADER_REQUEST_ID, requestId)
    redirectResponse.headers.set(HEADER_CORRELATION_ID, correlationId)
    return redirectResponse
  }

  // If user is logged in and tries to access login/signup, redirect to app
  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/app'
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.headers.set(HEADER_REQUEST_ID, requestId)
    redirectResponse.headers.set(HEADER_CORRELATION_ID, correlationId)
    return redirectResponse
  }

  return supabaseResponse
}
