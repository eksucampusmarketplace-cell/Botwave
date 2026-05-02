'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        router.push('/login?error=auth_callback_failed');
        return;
      }

      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/login?error=no_session');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <div className="font-display text-2xl font-black text-green tracking-[4px] mb-4">
          BOT<span className="text-cyan">WAVE</span>
        </div>
        <div className="font-mono text-xs text-[#5a9a7a] tracking-[2px]">
          AUTHENTICATING...
        </div>
        <div className="mt-4">
          <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
}