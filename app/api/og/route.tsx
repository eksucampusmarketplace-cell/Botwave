import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'BotWave Blog';

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1a12 50%, #0a0a0f 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '60px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              fontSize: '24px',
              color: 'white',
              fontWeight: 700,
            }}
          >
            B
          </div>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#10b981',
              letterSpacing: '-0.5px',
            }}
          >
            BotWave
          </span>
        </div>
        <div
          style={{
            fontSize: title.length > 60 ? '42px' : '52px',
            fontWeight: 800,
            color: '#f1f5f9',
            lineHeight: 1.2,
            maxWidth: '900px',
            letterSpacing: '-1px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: '32px',
            fontSize: '20px',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          www.botwave.online
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
