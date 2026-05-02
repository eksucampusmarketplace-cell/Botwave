import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { signupRateLimiter, applyRateLimiterConfig, areSettingsLoaded, settingsLoadedWithDefaults } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    // Ensure rate limit settings are loaded from database
    const supabase = await createClient();
    if (!areSettingsLoaded()) {
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('rate_limit_settings')
          .select('*');
        
        if (settingsError) {
          // If the table doesn't exist, we'll get a PGRST205 error
          if (settingsError.code === 'PGRST205') {
            console.log('Rate limit settings table not found, using defaults');
          } else {
            console.error('Failed to load rate limit settings:', settingsError);
          }
          settingsLoadedWithDefaults();
        } else if (settings && settings.length > 0) {
          applyRateLimiterConfig(settings);
        } else {
          settingsLoadedWithDefaults();
        }
      } catch (err) {
        console.error('Unexpected error loading rate limit settings:', err);
        settingsLoadedWithDefaults();
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

    // Use admin client to create user and auto-confirm email for "basic" login flow
    const adminSupabase = await createAdminClient();
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
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
      message: 'Account created successfully. You can now login.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}