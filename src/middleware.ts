// KiteDesk | pass-through middleware so dev/build always emit middleware-manifest.json
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_request: NextRequest) {
  void _request
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)',
  ],
}
