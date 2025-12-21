// src/app/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        // Jika sukses, router akan otomatis redirect karena Middleware mendeteksi cookie baru
        router.push('/input-data');
        router.refresh(); // Refresh agar middleware membaca cookie terbaru
      } else {
        setError('PIN Salah! Akses Ditolak.');
        setLoading(false);
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
        {/* Logo atau Judul */}
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">HR Portal Login</h1>
          <p className="text-gray-500 text-sm mt-1">Sistem Input Data Karyawan</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Masukkan PIN"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-[0.5em] font-bold text-gray-700 transition"
              maxLength={4}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm font-semibold bg-red-50 p-2 rounded animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg transform hover:-translate-y-1"
          >
            {loading ? 'Memeriksa...' : 'MASUK'}
          </button>
        </form>

        <p className="mt-8 text-xs text-gray-400">
          Hanya untuk penggunaan internal IT Department.
        </p>
      </div>
    </main>
  );
}