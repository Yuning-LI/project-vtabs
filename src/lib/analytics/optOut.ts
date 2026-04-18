const GA_OPT_OUT_COOKIE_NAME = 'vtabs_ga_opt_out'
const GA_OPT_OUT_QUERY_PARAM = 'ga_opt_out'
const GA_OPT_OUT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 5

function escapeInlineScript(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

export function getGaDisableFlagKey(measurementId: string) {
  return `ga-disable-${measurementId}`
}

export function isGaTrackingDisabled(measurementId: string) {
  if (!measurementId || typeof window === 'undefined') {
    return false
  }

  const flagKey = getGaDisableFlagKey(measurementId)
  return Boolean((window as typeof window & Record<string, unknown>)[flagKey])
}

export function buildGaOptOutBootstrapScript(measurementId: string) {
  const safeMeasurementId = escapeInlineScript(measurementId)
  const safeCookieName = escapeInlineScript(GA_OPT_OUT_COOKIE_NAME)
  const safeQueryParam = escapeInlineScript(GA_OPT_OUT_QUERY_PARAM)

  return `
    (function () {
      var measurementId = '${safeMeasurementId}';
      var cookieName = '${safeCookieName}';
      var queryParam = '${safeQueryParam}';
      var disableFlagKey = 'ga-disable-' + measurementId;

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

      var isDisabled = readCookie(cookieName) === '1';
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
