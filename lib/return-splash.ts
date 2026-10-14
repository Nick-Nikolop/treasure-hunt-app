export const SPLASH_ATTR = "data-th-splash"
export const LAST_SEEN_KEY = "thehunt:last-seen"
export const AWAY_MS = 12 * 60 * 60 * 1000

/**
 * Runs in <head> before first paint: flags the document when the visitor has
 * been away for a while, so the splash is visible from the very first frame
 * instead of popping in after hydration. /landing has its own loader.
 */
export const SPLASH_BOOT_SCRIPT = `try{var n=Date.now(),t=+localStorage.getItem("${LAST_SEEN_KEY}")||0;if(n-t>${AWAY_MS}&&location.pathname.indexOf("/landing")!==0&&!/bot|crawl|spider|slurp|preview|lighthouse/i.test(navigator.userAgent)){document.documentElement.setAttribute("${SPLASH_ATTR}","")}localStorage.setItem("${LAST_SEEN_KEY}",n)}catch(e){}`
