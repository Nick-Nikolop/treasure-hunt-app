import { NextResponse, type NextRequest } from "next/server"

/** Forwards the requested path so the root layout can exempt public pages from the maintenance gate. */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set("x-pathname", request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico|webp|mp4|txt|xml)$).*)"],
}
