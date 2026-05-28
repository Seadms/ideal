import { ImageResponse } from 'next/og'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#09090b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 108,
            height: 108,
            background: 'rgba(245,158,11,0.1)',
            border: '3px solid rgba(245,158,11,0.3)',
            borderRadius: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 72,
              color: '#fbbf24',
              fontFamily: 'serif',
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            i
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}
