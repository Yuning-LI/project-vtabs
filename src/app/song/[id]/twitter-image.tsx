import { createSongSocialImageResponse, SONG_SOCIAL_IMAGE_SIZE } from '@/lib/songbook/songSocialImage'

export const runtime = 'nodejs'

export const size = SONG_SOCIAL_IMAGE_SIZE

export const contentType = 'image/png'

export default function Image({
  params
}: {
  params: { id: string }
}) {
  return createSongSocialImageResponse(params.id)
}
