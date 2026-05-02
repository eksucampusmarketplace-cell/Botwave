import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signupRateLimiter, applyRateLimiterConfig, areSettingsLoaded } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Ensure rate limit settings are loaded from database
    const supabase = await createClient();
    if (!areSettingsLoaded()) {
      const { data: settings, error: settingsError } = await supabase
        .from('rate_limit_settings')
        .select('*');
      if (settingsError) {
        console.error('Failed to load rate limit settings:', settingsError);
      }
      if (settings && settings.length > 0) {
        applyRateLimiterConfig(settings);
      } else {
        // No settings found - use defaults (signup is disabled/unlimited)
        applyRateLimiterConfig([{
          setting_key: 'signup',
          setting_name: 'Sign Up',
          window_ms: 0,
          max_requests: 0,
          enabled: false,
          description: 'Sign up rate limit - disabled by default'
        }]);
      }
    }

    // Apply rate limiting only if enabled in settings
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'anonymous';
    if (!signupRateLimiter.isAllowed(ip)) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please wait a minute before trying again.' },
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