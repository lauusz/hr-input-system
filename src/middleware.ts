// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Ambil cookie
  const isAuth = request.cookies.get('office_session');
  const url = request.nextUrl.clone();

  // ATURAN 1: Jika user mau masuk ke '/input-data' TAPI belum login
  if (request.nextUrl.pathname.startsWith('/input-data')) {
    if (!isAuth) {
      // Tendang balik ke halaman login (Home)
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // ATURAN 2: Jika user buka Halaman Login ('/') TAPI sudah login
  if (request.nextUrl.pathname === '/') {
    if (isAuth) {
      // Langsung arahkan ke input data (biar ga usah isi PIN lagi)
      url.pathname = '/input-data';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

// Tentukan route mana saja yang dijaga satpam
export const config = {
  matcher: ['/', '/input-data'],
};