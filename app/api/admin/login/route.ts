import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Store active admin tokens in memory with expiry
const adminTokens: Map<string, { expiresAt: number; username: string }> = new Map();
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

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

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function cleanupExpiredTokens() {
  const now = Date.now();
  const tokensToDelete: string[] = [];
  adminTokens.forEach((data, token) => {
    if (now > data.expiresAt) {
      tokensToDelete.push(token);
    }
  });
  tokensToDelete.forEach(token => adminTokens.delete(token));
}

export async function POST(request: NextRequest) {
  try {
    cleanupExpiredTokens();

    const { username, password } = await request.json();

    const adminCreds = getAdminCredentials();

    if (username !== adminCreds.username || password !== adminCreds.password) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    const token = generateSecureToken();
    const expiresAt = Date.now() + TOKEN_EXPIRY_MS;
    adminTokens.set(token, { expiresAt, username });

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
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
