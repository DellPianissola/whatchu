const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const CONSENT_KEY = 'analytics_consent'

const isLoaded = () => typeof window.gtag === 'function'

const loadScript = () => {
  if (!MEASUREMENT_ID || isLoaded()) return

  const script = document.createElement('script')
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  script.async = true
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  // function declaration (não arrow): gtag depende de `arguments`, que não existe em arrow
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false })
}

export const getConsent = () => localStorage.getItem(CONSENT_KEY)

export const acceptAnalytics = () => {
  localStorage.setItem(CONSENT_KEY, 'accepted')
  loadScript()
}

export const declineAnalytics = () => {
  localStorage.setItem(CONSENT_KEY, 'declined')
}

export const initAnalytics = () => {
  if (getConsent() === 'accepted') loadScript()
}

export const trackPageView = (path) => {
  if (!isLoaded()) return
  window.gtag('event', 'page_view', { page_path: path })
}
