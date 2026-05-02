import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signupRateLimiter, applyRateLimiterConfig, areSettingsLoaded } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Ensure rate limit settings are loaded
    const supabase = await createClient();
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
    if (!signupRateLimiter.isAllowed(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: 'Email, password, and username are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
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
      message: 'Account created successfully',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}