import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { loginRateLimiter, applyRateLimiterConfig, areSettingsLoaded } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Ensure rate limit settings are loaded
    if (!areSettingsLoaded()) {
      const { data: settings } = await supabase
        .from('rate_limit_settings')
        .select('*');
      if (settings) {
        applyRateLimiterConfig(settings);
      }
    }

    // Apply rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'anonymous';
    if (!loginRateLimiter.isAllowed(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const isRateLimit = error.message.toLowerCase().includes('rate limit');
      return NextResponse.json(
        { error: error.message },
        { status: isRateLimit ? 429 : 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}