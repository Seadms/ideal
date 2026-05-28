import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            background: 'rgba(245,158,11,0.15)',
            border: '1.5px solid rgba(245,158,11,0.4)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 11,
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
