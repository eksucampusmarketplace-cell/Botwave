'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function StudyLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'validating' | 'success' | 'error'>('validating');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No login token provided. Use the !study command in WhatsApp to get a login link.');
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(`/api/study/auth?token=${encodeURIComponent(token!)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setStatus('error');
          setErrorMsg(data.error || 'Invalid or expired token. Please generate a new one with !study.');
          return;
        }

        setStatus('success');
        // Redirect to Study Hub after brief success message
        setTimeout(() => {
          router.push(data.redirect || '/dashboard/study');
        }, 1500);
      } catch {
        setStatus('error');
        setErrorMsg('Connection error. Please try again.');
      }
    }

    validateToken();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            {status === 'validating' && (
              <svg className="w-8 h-8 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === 'success' && (
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'error' && (
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            {status === 'validating' && 'Logging you in...'}
            {status === 'success' && 'Welcome to Study Hub!'}
            {status === 'error' && 'Login Failed'}
          </h1>

          <p className="text-gray-400">
            {status === 'validating' && 'Verifying your token...'}
            {status === 'success' && 'Redirecting to Study Hub...'}
            {status === 'error' && errorMsg}
          </p>
        </div>

        {status === 'error' && (
          <div className="mt-4 p-4 bg-gray-700/50 rounded-lg text-left">
            <p className="text-sm text-gray-300 mb-2">
              <span className="font-semibold text-emerald-400">How to access Study Hub:</span>
            </p>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Open WhatsApp with your bot</li>
              <li>Send <code className="bg-gray-600 px-1 rounded text-emerald-300">!study</code></li>
              <li>Click the link the bot sends you</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
