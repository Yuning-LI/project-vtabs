const redirects = [
  ['twinkle', 'twinkle-twinkle-little-star'],
  ['mary-lamb', 'mary-had-a-little-lamb'],
  ['sakura', 'sakura-sakura'],
  ['blue-danube', 'the-blue-danube'],
  ['battle-hymn', 'battle-hymn-of-the-republic']
]

const nextConfig = {
  async redirects() {
    return redirects.map(([sourceId, destinationId]) => ({
      source: `/song/${sourceId}`,
      destination: `/song/${destinationId}`,
      permanent: true
    }))
  }
}

export default nextConfig
