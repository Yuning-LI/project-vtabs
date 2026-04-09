import { getLearnGuideSlugs } from '@/lib/learn/content'
import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'
import { songCatalog } from '@/lib/songbook/catalog'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date()
    },
    {
      url: `${siteUrl}/learn`,
      lastModified: new Date()
    },
    ...getLearnGuideSlugs().map(slug => ({
      url: `${siteUrl}/learn/${slug}`,
      lastModified: new Date()
    })),
    ...songCatalog.map(song => ({
      url: `${siteUrl}/song/${song.slug}`,
      lastModified: new Date()
    }))
  ]
}
