import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const VIEW_MAP: Record<string, string> = {
  '/documents': 'documents',
  '/history': 'history',
  '/integrations': 'integrations',
  '/account': 'account',
  '/notifications': 'notifications',
  '/billing': 'billing',
  '/settings': 'settings',
  '/create-agent': 'create-agent',
  '/payments': 'payments',
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Redirect old routes to SPA params
  const mappedView = VIEW_MAP[pathname]
  if (mappedView) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('view', mappedView)
    // Preserve existing query params (e.g., OAuth callbacks)
    searchParams.forEach((v, k) => {
      if (k !== 'view') url.searchParams.set(k, v)
    })
    return NextResponse.redirect(url)
  }

  // /agents/xxx → /dashboard?view=agent&agentId=xxx
  const agentMatch = pathname.match(/^\/agents\/(.+)$/)
  if (agentMatch) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('view', 'agent')
    url.searchParams.set('agentId', agentMatch[1])
    return NextResponse.redirect(url)
  }

  // /chat/xxx → /dashboard?chat=xxx&chatFullscreen=true
  const chatMatch = pathname.match(/^\/chat\/(.+)$/)
  if (chatMatch) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('chat', chatMatch[1])
    url.searchParams.set('chatFullscreen', 'true')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/documents',
    '/history',
    '/integrations',
    '/account',
    '/notifications',
    '/billing',
    '/settings',
    '/create-agent',
    '/payments',
    '/agents/:path*',
    '/chat/:path*',
  ],
}
