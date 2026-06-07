import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Em producao, frontend e API estao em dominios diferentes.
// O cookie de refresh nao e enviado para o Vercel — apenas para o Worker.
// A autenticacao e tratada inteiramente no cliente (layouts com tokenStore + sessionStorage).
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
