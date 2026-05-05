import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken, revokeAdminToken } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    
    if (adminToken?.value) {
      // Revoke the token server-side
      revokeAdminToken(adminToken.value);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the cookie with immediate expiry
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