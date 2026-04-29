declare module 'next/image' {
  import * as React from 'react'

  const Image: React.ComponentType<Record<string, unknown>>
  export default Image
}

declare module 'next/link' {
  import * as React from 'react'

  const Link: React.ComponentType<Record<string, unknown>>
  export default Link
}

declare module 'next/server' {
  export class NextRequest extends Request {
    readonly nextUrl: URL
  }

  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse
    static next(init?: ResponseInit): NextResponse
  }
}
