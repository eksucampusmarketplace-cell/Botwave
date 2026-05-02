import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { loginRateLimiter, applyRateLimiterConfig, areSettingsLoaded, settingsLoadedWithDefaults } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Ensure rate limit settings are loaded from database
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

    // Apply rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'anonymous';
    if (!loginRateLimiter.isAllowed(ip)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email/Username and password are required' },
        { status: 400 }
      );
    }

    let loginEmail = email;
    // If it's not an email, assume it's a username
    if (!email.includes('@')) {
      const adminSupabase = await createAdminClient();
      const { data: profile, error: profileError } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('username', email)
        .single();
      
      if (profileError && profileError.code === 'PGRST205') {
        console.warn('profiles table not found, cannot resolve username to email');
      }
      
      if (profile) {
        const { data: userData, error: userError } = await adminSupabase.auth.admin.getUserById(profile.id);
        if (userData?.user?.email) {
          loginEmail = userData.user.email;
        }
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
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