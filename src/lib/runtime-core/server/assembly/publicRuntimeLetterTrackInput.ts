import type {
  PublicRuntimePayload,
  PublicRuntimeState
} from '../../runtimeTypes.ts'
import type {
  PublicRuntimeLetterTrackInput
} from './publicRuntimeBuildInput.ts'
import type { loadPublicRuntimeNotationSong } from '../payload/publicRuntimeSongData.ts'

export function buildPublicRuntimeLetterTrackInput(input: {
  song: ReturnType<typeof loadPublicRuntimeNotationSong> | null | undefined
  payload: PublicRuntimePayload
  state: PublicRuntimeState
}): PublicRuntimeLetterTrackInput {
  return {
    notation: input.song?.notation,
    rawNotation: typeof input.payload.notation === 'string' ? input.payload.notation : null,
    key: input.song?.meta?.key,
    mode: input.state.note_label_mode,
    payload: input.payload,
    state: input.state
  }
}
