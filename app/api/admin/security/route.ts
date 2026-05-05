import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';
import { getRecentLoginAttempts, getAuditLog } from '@/lib/admin-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token');
    const tokenValidation = await verifyAdminToken(adminToken?.value);
    
    if (!tokenValidation) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginAttempts = getRecentLoginAttempts(50);
    const auditLog = getAuditLog(50);

    return NextResponse.json({
      success: true,
      data: {
        loginAttempts,
        auditLog,
        security: {
          authMethod: 'HMAC-signed tokens (Web Crypto API)',
          tokenExpiry: '24 hours',
          bruteForceProtection: '5 failed attempts = 15 min lockout',
          cookieFlags: 'httpOnly, secure (prod), sameSite=strict',
          passwordComparison: 'timing-safe (crypto.timingSafeEqual)',
        },
      },
    });
  } catch (error) {
    console.error('Admin security API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
