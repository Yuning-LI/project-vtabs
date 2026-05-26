import { ImageResponse } from 'next/og'
import { songCatalogBySlug } from './catalog'
import { getSongPresentation } from './presentation'

export const SONG_SOCIAL_IMAGE_SIZE = {
  width: 1000,
  height: 1500
} as const

type SongSocialImageModel = {
  title: string
  eyebrow: string
  summary: string
  supportTag: string
}

export function createSongSocialImageResponse(songId: string) {
  try {
    return buildSongSocialImageResponse(getSongSocialImageModel(songId))
  } catch (error) {
    console.error(`[songSocialImage] failed to render social image for "${songId}"`, error)
    return buildSongSocialImageResponse(getFallbackSongSocialImageModel(songId))
  }
}

function buildSongSocialImageResponse(model: SongSocialImageModel) {
  return new ImageResponse(renderSongSocialImage(model), {
    ...SONG_SOCIAL_IMAGE_SIZE
  })
}

function getSongSocialImageModel(songId: string): SongSocialImageModel {
  const song = songCatalogBySlug[songId]

  if (!song) {
    return getFallbackSongSocialImageModel(songId)
  }

  const presentation = getSongPresentation(song)
  return {
    title: toAsciiDisplayText(presentation.title),
    eyebrow: toAsciiDisplayText(`${presentation.familyLabel} | ${presentation.difficultyLabel}`),
    summary: truncateText(
      toAsciiDisplayText(presentation.metaDescription || presentation.overview),
      180
    ),
    supportTag: 'Ocarina, recorder, and tin whistle'
  }
}

function getFallbackSongSocialImageModel(songId: string): SongSocialImageModel {
  const song = songCatalogBySlug[songId]
  const fallbackTitle =
    toAsciiDisplayText(song?.title?.trim() || '') ||
    formatSongIdAsTitle(songId) ||
    'Play By Fingering'

  return {
    title: fallbackTitle,
    eyebrow: 'Letter Notes and Fingering Charts',
    summary:
      fallbackTitle === 'Play By Fingering'
        ? 'English melody pages with letter notes, optional numbered notes, and switchable ocarina, recorder, and tin whistle views.'
        : `Open ${fallbackTitle} on Play By Fingering for letter notes, optional numbered notes, and fingering charts on supported instruments.`,
    supportTag: 'Ocarina, recorder, and tin whistle'
  }
}

function formatSongIdAsTitle(songId: string) {
  const normalized = songId
    .trim()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')

  if (!normalized) {
    return ''
  }

  return normalized.replace(/\b\w/g, char => char.toUpperCase())
}

function renderSongSocialImage(model: SongSocialImageModel) {
  const titleFontSize =
    model.title.length <= 22 ? 88 : model.title.length <= 38 ? 74 : 62

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
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '44px 34px 40px'
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
              display: 'flex',
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
              flexDirection: 'column'
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
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flex: 1,
            marginTop: 34,
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRadius: 40,
            border: '1px solid rgba(255,255,255,0.82)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(247,238,223,0.98) 100%)',
            boxShadow: '0 16px 34px rgba(84,58,32,0.06)',
            padding: '28px 28px 24px'
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 20
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                padding: '20px 22px',
                borderRadius: 30,
                background: 'rgba(255,255,255,0.94)',
                border: '1px solid rgba(221,202,175,0.56)'
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
                  alignSelf: 'flex-start',
                  padding: '12px 18px',
                  borderRadius: 999,
                  background: 'rgba(140,95,31,0.1)',
                  fontFamily: 'Arial, sans-serif',
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#6d563f'
                }}
              >
                {model.supportTag}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                padding: '22px 22px 18px',
                borderRadius: 30,
                background: 'rgba(255,252,247,0.8)',
                border: '1px solid rgba(221,202,175,0.48)'
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
                  gap: 20
                }}
              >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0
                }}
              >
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
                  {'Play the full song ->'}
                </div>
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

function toAsciiDisplayText(value: string) {
  if (!value) {
    return ''
  }

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
