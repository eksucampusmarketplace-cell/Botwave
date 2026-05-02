import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Validate OpenAI API key format
function validateApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  // OpenAI keys start with 'sk-' and are 20-200 characters
  if (!key.startsWith('sk-')) {
    return false;
  }
  if (key.length < 20 || key.length > 200) {
    return false;
  }
  return true;
}

// Mask API key for client response
function maskApiKey(key: string): string {
  if (!key || key.length < 12) {
    return 'sk-****';
  }
  const prefix = key.substring(0, 7); // sk-proj- or sk-
  const suffix = key.substring(key.length - 4);
  return `${prefix}****...${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { openaiApiKey } = await request.json();

    // Validate API key format before storing
    if (!validateApiKey(openaiApiKey)) {
      return NextResponse.json(
        { error: 'Invalid API key format. OpenAI API keys must start with "sk-" and be between 20-200 characters.' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        openai_api_key: openaiApiKey,
      },
    });

    if (updateError) {
      console.error('Error updating user settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to save settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully',
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Return masked API key to client - never expose raw key
    const rawKey = user.user_metadata?.openai_api_key;
    
    return NextResponse.json({
      openaiApiKey: rawKey ? maskApiKey(rawKey) : null,
    });
  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}