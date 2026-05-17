import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { GA_INTERNAL_TRAFFIC_COOKIE_NAME } from './src/lib/analytics/optOut'

const INTERNAL_IP_RULES_ENV = 'GA_INTERNAL_IP_RULES'
const INTERNAL_TRAFFIC_COOKIE_MAX_AGE = 60 * 60
const DEFAULT_INTERNAL_IP_RULES = ['104.215.151.123', '175.146.62.91']

function shouldSkipMiddleware(pathname: string) {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/k-static/') ||
    /\.[a-z0-9]+$/i.test(pathname)
  )
}

function normalizeClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const forwardedIp = forwardedFor?.split(',')[0]?.trim()
  const candidate = forwardedIp || request.ip || ''
  return candidate.replace(/^\[|\]$/g, '')
}

function parseIpv4ToNumber(ip: string) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) {
    return null
  }

  const octets = ip.split('.').map(segment => Number.parseInt(segment, 10))
  if (octets.some(octet => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return null
  }

  return octets.reduce((value, octet) => (value << 8) + octet, 0) >>> 0
}

function matchIpv4Cidr(ip: string, rule: string) {
  const [network, prefixLengthText] = rule.split('/')
  const ipNumber = parseIpv4ToNumber(ip)
  const networkNumber = parseIpv4ToNumber(network)
  const prefixLength = Number.parseInt(prefixLengthText ?? '', 10)

  if (
    ipNumber === null ||
    networkNumber === null ||
    Number.isNaN(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > 32
  ) {
    return false
  }

  const mask = prefixLength === 0 ? 0 : (~((1 << (32 - prefixLength)) - 1) >>> 0)
  return (ipNumber & mask) === (networkNumber & mask)
}

function matchIpRule(ip: string, rule: string) {
  if (!ip || !rule) {
    return false
  }

  if (rule.includes('/')) {
    return matchIpv4Cidr(ip, rule)
  }

  if (rule.endsWith('*')) {
    return ip.startsWith(rule.slice(0, -1))
  }

  return ip === rule
}

function readInternalIpRules() {
  const rawValue = process.env[INTERNAL_IP_RULES_ENV] ?? ''
  return [...DEFAULT_INTERNAL_IP_RULES, ...rawValue
    .split(/[\n,]/)
    .map(rule => rule.trim())
    .filter(Boolean)]
}

export function middleware(request: NextRequest) {
  if (shouldSkipMiddleware(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const clientIp = normalizeClientIp(request)
  const internalIpRules = readInternalIpRules()
  const isInternalTraffic =
    clientIp.length > 0 && internalIpRules.some(rule => matchIpRule(clientIp, rule))

  if (isInternalTraffic) {
    response.cookies.set(GA_INTERNAL_TRAFFIC_COOKIE_NAME, '1', {
      path: '/',
      sameSite: 'lax',
      maxAge: INTERNAL_TRAFFIC_COOKIE_MAX_AGE
    })
  } else if (request.cookies.get(GA_INTERNAL_TRAFFIC_COOKIE_NAME)?.value === '1') {
    response.cookies.delete(GA_INTERNAL_TRAFFIC_COOKIE_NAME)
  }

  return response
}
