import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EXECUTOR_ENABLED = process.env.NEXT_PUBLIC_FEATURE_EXECUTOR === "true";
const SIGNALS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_SIGNALS === "true";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!EXECUTOR_ENABLED && pathname === "/executor") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("toast", "recurso_em_breve");
    return NextResponse.redirect(url);
  }

  if (!SIGNALS_ENABLED && pathname === "/analise") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("toast", "recurso_em_breve");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/executor", "/analise"],
};
