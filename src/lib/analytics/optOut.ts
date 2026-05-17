const GA_OPT_OUT_COOKIE_NAME = 'vtabs_ga_opt_out'
export const GA_INTERNAL_TRAFFIC_COOKIE_NAME = 'vtabs_ga_internal_traffic'
const GA_OPT_OUT_QUERY_PARAM = 'ga_opt_out'
const GA_OPT_OUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const AUTOMATION_USER_AGENT_PATTERNS = [/HeadlessChrome/i, /Playwright/i, /Puppeteer/i]

function escapeInlineScript(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function isPrivateIpv4Hostname(hostname: string) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return false
  }

  const octets = hostname.split('.').map(segment => Number.parseInt(segment, 10))
  if (octets.some(octet => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false
  }

  const [first, second] = octets
  return (
    first === 10 ||
    first === 127 ||
    (first === 192 && second === 168) ||
    (first === 172 && second >= 16 && second <= 31)
  )
}

function isPrivateIpv6Hostname(hostname: string) {
  const normalized = hostname.toLowerCase()
  return normalized === '::1' || normalized === '[::1]' || normalized.startsWith('fc') || normalized.startsWith('fd')
}

function isLocalDevelopmentHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  return (
    LOCAL_HOSTNAMES.has(normalized) ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.vercel.app') ||
    isPrivateIpv4Hostname(normalized) ||
    isPrivateIpv6Hostname(normalized)
  )
}

function isAutomationBrowser() {
  if (typeof window === 'undefined') {
    return false
  }

  const navigatorLike = window.navigator as Navigator & { webdriver?: boolean }
  if (navigatorLike.webdriver) {
    return true
  }

  const userAgent = navigatorLike.userAgent ?? ''
  if (AUTOMATION_USER_AGENT_PATTERNS.some(pattern => pattern.test(userAgent))) {
    return true
  }

  const globalWindow = window as typeof window & {
    __playwright__binding__?: unknown
    __pwManual?: unknown
  }

  return Boolean(globalWindow.__playwright__binding__ || globalWindow.__pwManual)
}

function readCookie(name: string) {
  if (typeof document === 'undefined') {
    return ''
  }

  const entries = document.cookie ? document.cookie.split('; ') : []
  for (const entry of entries) {
    const parts = entry.split('=')
    const key = parts.shift()
    if (key === name) {
      return decodeURIComponent(parts.join('='))
    }
  }

  return ''
}

export function isGaTrackingAutoSuppressed() {
  if (typeof window === 'undefined') {
    return false
  }

  const pathname = window.location.pathname
  return (
    isLocalDevelopmentHostname(window.location.hostname) ||
    pathname === '/dev' ||
    pathname.startsWith('/dev/') ||
    isAutomationBrowser() ||
    readCookie(GA_INTERNAL_TRAFFIC_COOKIE_NAME) === '1'
  )
}

export function getGaDisableFlagKey(measurementId: string) {
  return `ga-disable-${measurementId}`
}

export function isGaTrackingDisabled(measurementId: string) {
  if (!measurementId || typeof window === 'undefined') {
    return false
  }

  const flagKey = getGaDisableFlagKey(measurementId)
  return (
    Boolean((window as typeof window & Record<string, unknown>)[flagKey]) ||
    isGaTrackingAutoSuppressed()
  )
}

export function buildGaOptOutBootstrapScript(measurementId: string) {
  const safeMeasurementId = escapeInlineScript(measurementId)
  const safeCookieName = escapeInlineScript(GA_OPT_OUT_COOKIE_NAME)
  const safeInternalCookieName = escapeInlineScript(GA_INTERNAL_TRAFFIC_COOKIE_NAME)
  const safeQueryParam = escapeInlineScript(GA_OPT_OUT_QUERY_PARAM)

  return `
    (function () {
      var measurementId = '${safeMeasurementId}';
      var cookieName = '${safeCookieName}';
      var internalCookieName = '${safeInternalCookieName}';
      var queryParam = '${safeQueryParam}';
      var disableFlagKey = 'ga-disable-' + measurementId;

      function isPrivateIpv4Hostname(hostname) {
        if (!/^\\d{1,3}(?:\\.\\d{1,3}){3}$/.test(hostname)) {
          return false;
        }
        var octets = hostname.split('.').map(function (segment) {
          return parseInt(segment, 10);
        });
        for (var index = 0; index < octets.length; index += 1) {
          var octet = octets[index];
          if (!Number.isFinite(octet) || octet < 0 || octet > 255) {
            return false;
          }
        }
        var first = octets[0];
        var second = octets[1];
        return (
          first === 10 ||
          first === 127 ||
          (first === 192 && second === 168) ||
          (first === 172 && second >= 16 && second <= 31)
        );
      }

      function isPrivateIpv6Hostname(hostname) {
        return (
          hostname === '::1' ||
          hostname === '[::1]' ||
          hostname.indexOf('fc') === 0 ||
          hostname.indexOf('fd') === 0
        );
      }

      function isLocalDevelopmentHostname(hostname) {
        var normalized = (hostname || '').trim().toLowerCase();
        if (!normalized) {
          return false;
        }

        return (
          normalized === 'localhost' ||
          normalized === '127.0.0.1' ||
          normalized === '::1' ||
          normalized === '[::1]' ||
          normalized.slice(-6) === '.local' ||
          normalized.slice(-10) === '.localhost' ||
          normalized.slice(-11) === '.vercel.app' ||
          isPrivateIpv4Hostname(normalized) ||
          isPrivateIpv6Hostname(normalized)
        );
      }

      function isAutomationBrowser() {
        var navigatorLike = window.navigator || {};
        if (navigatorLike.webdriver) {
          return true;
        }

        var userAgent = navigatorLike.userAgent || '';
        return (
          /HeadlessChrome/i.test(userAgent) ||
          /Playwright/i.test(userAgent) ||
          /Puppeteer/i.test(userAgent) ||
          Boolean(window.__playwright__binding__) ||
          Boolean(window.__pwManual)
        );
      }

      function readCookie(name) {
        var entries = document.cookie ? document.cookie.split('; ') : [];
        for (var index = 0; index < entries.length; index += 1) {
          var parts = entries[index].split('=');
          var key = parts.shift();
          if (key === name) {
            return decodeURIComponent(parts.join('='));
          }
        }
        return '';
      }

      function writeCookie(value) {
        document.cookie =
          cookieName +
          '=' +
          encodeURIComponent(value) +
          '; path=/; max-age=${GA_OPT_OUT_COOKIE_MAX_AGE}; SameSite=Lax';
      }

      function removeCookie() {
        document.cookie = cookieName + '=; path=/; max-age=0; SameSite=Lax';
      }

      var params = new URLSearchParams(window.location.search);
      var queryValue = params.get(queryParam);
      if (queryValue === '1') {
        writeCookie('1');
      } else if (queryValue === '0') {
        removeCookie();
      }

      var isDisabled =
        readCookie(cookieName) === '1' ||
        readCookie(internalCookieName) === '1' ||
        isLocalDevelopmentHostname(window.location.hostname) ||
        window.location.pathname === '/dev' ||
        window.location.pathname.indexOf('/dev/') === 0 ||
        isAutomationBrowser();
      window[disableFlagKey] = isDisabled;

      if (queryValue === '1' || queryValue === '0') {
        params.delete(queryParam);
        var nextSearch = params.toString();
        var nextUrl =
          window.location.pathname +
          (nextSearch ? '?' + nextSearch : '') +
          window.location.hash;
        window.history.replaceState({}, '', nextUrl);
      }
    })();
  `
}
