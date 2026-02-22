/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://project-vtabs.vercel.app',
  generateRobotsTxt: true,
  exclude: [],
  robotsTxtOptions: {
    policies: [{ userAgent: '*', allow: '/' }]
  }
}
