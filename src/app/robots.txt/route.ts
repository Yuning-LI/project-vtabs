import { siteUrl } from '@/lib/site'

export const dynamic = 'force-static'

export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /dev/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    `Host: ${siteUrl}`,
    ''
  ].join('\n')

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600'
    }
  })
}
