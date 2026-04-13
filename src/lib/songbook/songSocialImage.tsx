import { ImageResponse } from 'next/og'
import { songCatalogBySlug } from './catalog'
import { getSongPresentation } from './presentation'

export const SONG_SOCIAL_IMAGE_SIZE = {
  width: 1000,
  height: 1500
} as const

type SongSocialImageModel = {
  title: string
  alias: string | null
  eyebrow: string
  summary: string
  keyFacts: string[]
}

export function createSongSocialImageResponse(songId: string) {
  const model = getSongSocialImageModel(songId)

  return new ImageResponse(renderSongSocialImage(model), {
    ...SONG_SOCIAL_IMAGE_SIZE
  })
}

function getSongSocialImageModel(songId: string): SongSocialImageModel {
  const song = songCatalogBySlug[songId]

  if (!song) {
    return {
      title: 'Play By Fingering',
      alias: null,
      eyebrow: 'Letter Notes and Fingering Charts',
      summary:
        'English melody pages with letter notes, optional numbered notes, and switchable ocarina, recorder, and tin whistle views.',
      keyFacts: ['Letter notes by default', 'Numbered notes available', 'Fingering charts included']
    }
  }

  const presentation = getSongPresentation(song)
  const primaryAlias = presentation.aliases[0] ?? null

  return {
    title: presentation.title,
    alias: primaryAlias,
    eyebrow: `${presentation.familyLabel} · ${presentation.difficultyLabel}`,
    summary: truncateText(
      presentation.metaDescription || presentation.overview,
      180
    ),
    keyFacts: [
      'Letter notes by default',
      'Numbered notes available',
      'Ocarina, recorder, and tin whistle views'
    ]
  }
}

function renderSongSocialImage(model: SongSocialImageModel) {
  const titleFontSize =
    model.title.length <= 22 ? 88 : model.title.length <= 38 ? 74 : 62
  const aliasFontSize = model.alias && model.alias.length > 40 ? 28 : 32

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        background:
          'linear-gradient(180deg, rgba(255,247,236,1) 0%, rgba(240,224,197,1) 100%)',
        color: '#1f1b16',
        fontFamily: 'Georgia, "Times New Roman", serif',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex'
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: -100,
            top: -120,
            width: 340,
            height: 340,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.45)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -120,
            top: 260,
            width: 300,
            height: 300,
            borderRadius: 999,
            background: 'rgba(224,198,156,0.38)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 70,
            bottom: -120,
            width: 430,
            height: 260,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.26)'
          }}
        />
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 56px 52px'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              padding: '12px 20px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.85)',
              background: 'rgba(255,255,255,0.72)',
              fontFamily: 'Arial, sans-serif',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6d563f'
            }}
          >
            {model.eyebrow}
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: titleFontSize,
                fontWeight: 700,
                lineHeight: 0.96,
                letterSpacing: '-0.05em',
                color: '#1f1b16'
              }}
            >
              {model.title}
            </div>

            {model.alias ? (
              <div
                style={{
                  display: 'flex',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: aliasFontSize,
                  fontWeight: 600,
                  lineHeight: 1.15,
                  color: '#6d563f'
                }}
              >
                Also searched as {model.alias}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            marginTop: 34,
            padding: '28px 30px',
            borderRadius: 34,
            border: '1px solid rgba(255,255,255,0.82)',
            background: 'rgba(255,255,255,0.88)',
            boxShadow: '0 24px 54px rgba(84,58,32,0.08)'
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: 'Arial, sans-serif',
              fontSize: 34,
              lineHeight: 1.3,
              color: '#2f261f'
            }}
          >
            {model.summary}
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 14
            }}
          >
            {model.keyFacts.map(item => (
              <div
                key={item}
                style={{
                  display: 'flex',
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: 'rgba(140,95,31,0.1)',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#6d563f'
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flex: 1,
            marginTop: 34
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderRadius: 38,
              border: '1px solid rgba(255,255,255,0.78)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(247,238,223,0.96) 100%)',
              boxShadow: '0 24px 54px rgba(84,58,32,0.09)',
              padding: '34px 34px 30px'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20
              }}
            >
              {[0, 1, 2].map(index => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    paddingBottom: 14,
                    borderBottom:
                      index === 2 ? 'none' : '1px solid rgba(140,95,31,0.12)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 8
                    }}
                  >
                    {Array.from({ length: 12 }).map((_, dotIndex) => (
                      <div
                        key={`${index}-${dotIndex}`}
                        style={{
                          width: dotIndex % 5 === 0 ? 28 : 18,
                          height: dotIndex % 5 === 0 ? 28 : 18,
                          borderRadius: 999,
                          background:
                            dotIndex % 5 === 0
                              ? 'rgba(122,83,49,0.9)'
                              : 'rgba(122,83,49,0.24)'
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10
                    }}
                  >
                    {Array.from({ length: 6 }).map((_, lineIndex) => (
                      <div
                        key={`${index}-line-${lineIndex}`}
                        style={{
                          width: lineIndex === 5 ? 88 : 118,
                          height: 7,
                          borderRadius: 999,
                          background:
                            lineIndex % 2 === 0
                              ? 'rgba(122,83,49,0.5)'
                              : 'rgba(122,83,49,0.22)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 20,
                marginTop: 26
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#8c5f1f'
                  }}
                >
                  Partial Preview
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Arial, sans-serif',
                    fontSize: 28,
                    color: '#3b3027'
                  }}
                >
                  Open the full song page for the complete view
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '18px 26px',
                  borderRadius: 999,
                  background: '#2f261f',
                  color: '#fff7ec',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: 24,
                  fontWeight: 700
                }}
              >
                Play the full song
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24
          }}
        >
          <div
            style={{
              display: 'flex',
              fontFamily: 'Arial, sans-serif',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#6d563f'
            }}
          >
            Play By Fingering
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Arial, sans-serif',
              fontSize: 30,
              fontWeight: 700,
              color: '#1f1b16'
            }}
          >
            playbyfingering.com
          </div>
        </div>
      </div>
    </div>
  )
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  const next = value.slice(0, maxLength - 1)
  const boundary = next.lastIndexOf(' ')
  return `${(boundary > 80 ? next.slice(0, boundary) : next).trim()}...`
}
