// src/app/api/auth/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { pin } = await req.json();

    // AMBIL PIN DARI .ENV (Fallback ke '0000' jika lupa setting .env)
    const CORRECT_PIN = process.env.APP_PIN || '0000';

    if (pin === CORRECT_PIN) {
      const response = NextResponse.json({ success: true });

      // Set Cookie 'office_session' (Berlaku 1 Hari)
      response.cookies.set('office_session', 'verified', {
        httpOnly: true, 
        path: '/',
        maxAge: 60 * 60 * 24, 
      });

      return response;
    } 
    
    return NextResponse.json({ error: 'PIN Salah!' }, { status: 401 });

  } catch (e) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}