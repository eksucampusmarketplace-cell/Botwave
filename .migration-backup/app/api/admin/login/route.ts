import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateSecureToken, storeAdminToken } from '@/lib/admin-auth';
import { isLockedOut, recordLoginAttempt, logAdminAction, getClientIp } from '@/lib/admin-security';

const FAILED_LOGIN_DELAY_MS = 500;

function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required. ' +
      'Please set them in your .env file.'
    );
  }

  return { username, password };
}

async function constantTimeDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers);

    // Check brute-force lockout before processing
    const lockout = isLockedOut(clientIp);
    if (lockout.locked) {
      const remainingMin = Math.ceil(lockout.remainingMs / 60_000);
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${remainingMin} minute(s).` },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    let authSuccess = false;
    let adminCreds: { username: string; password: string };

    try {
      adminCreds = getAdminCredentials();
      
      const usernameBuffer = Buffer.from(username || '');
      const expectedUsernameBuffer = Buffer.from(adminCreds.username);
      
      const usernameMatch = usernameBuffer.length === expectedUsernameBuffer.length &&
        crypto.timingSafeEqual(usernameBuffer, expectedUsernameBuffer);

      const passwordBuffer = Buffer.from(password || '');
      const expectedPasswordBuffer = Buffer.from(adminCreds.password);
      
      const passwordMatch = passwordBuffer.length === expectedPasswordBuffer.length &&
        crypto.timingSafeEqual(passwordBuffer, expectedPasswordBuffer);

      authSuccess = usernameMatch && passwordMatch;
    } catch (credsError) {
      console.error('Admin login error - credentials check failed:', credsError);
      recordLoginAttempt(clientIp, username || 'unknown', false);
      await constantTimeDelay();
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!authSuccess) {
      recordLoginAttempt(clientIp, username || 'unknown', false);
      logAdminAction('anonymous', 'login_failed', 'admin', `Failed login attempt as "${username}"`, clientIp);
      await constantTimeDelay();
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Successful login
    recordLoginAttempt(clientIp, username, true);
    logAdminAction(username, 'login', 'admin', 'Admin logged in successfully', clientIp);

    const token = await generateSecureToken(username);
    storeAdminToken(token, username);

    const response = NextResponse.json({
      success: true,
      message: 'Admin authenticated successfully',
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    
    if (adminToken?.value) {
      const { revokeAdminToken } = await import('@/lib/admin-auth');
      revokeAdminToken(adminToken.value);
    }

    const clientIp = getClientIp(request.headers);
    logAdminAction('admin', 'logout', 'admin', 'Admin logged out', clientIp);

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
