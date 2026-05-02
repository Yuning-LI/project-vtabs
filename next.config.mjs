const redirects = [
  ['twinkle', 'twinkle-twinkle-little-star'],
  ['mary-lamb', 'mary-had-a-little-lamb'],
  ['sakura', 'sakura-sakura'],
  ['jingle-bells-english', 'jingle-bells'],
  ['silent-night-english', 'silent-night'],
  ['aura-lea', 'aura-lee']
]

const rawRuntimeTraceExcludes = [
  './data/kuailepu-runtime/**/*',
  './reference/songs/**/*'
]

const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      '/*': rawRuntimeTraceExcludes,
      '/api/kuailepu-runtime/[id]': rawRuntimeTraceExcludes,
      '/song/[id]': rawRuntimeTraceExcludes,
      '/learn': rawRuntimeTraceExcludes,
      '/learn/[slug]': rawRuntimeTraceExcludes,
      '/dev/kuailepu-preview': rawRuntimeTraceExcludes,
      '/dev/kuailepu-preview/[id]': rawRuntimeTraceExcludes,
      '/dev/pinterest/song/[id]': rawRuntimeTraceExcludes,
      '/dev/print/song/[id]': rawRuntimeTraceExcludes,
      '/dev/song-import-dashboard': rawRuntimeTraceExcludes
    }
  },
  async redirects() {
    return redirects.map(([sourceId, destinationId]) => ({
      source: `/song/${sourceId}`,
      destination: `/song/${destinationId}`,
      permanent: true
    }))
  }
}

export default nextConfig
