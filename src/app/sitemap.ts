import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'
import { songCatalog } from '@/lib/songbook/catalog'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date()
    },
    ...songCatalog.map(song => ({
      url: `${siteUrl}/song/${song.slug}`,
      lastModified: new Date()
    }))
  ]
}
