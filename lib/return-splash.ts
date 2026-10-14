export const SPLASH_ATTR = "data-th-splash"
export const SPLASH_MS = 5000

/**
 * Runs in <head> before first paint so the loading video covers the page from
 * the very first frame. /landing has its own loader; bots skip it.
 */
export const SPLASH_BOOT_SCRIPT = `try{if(location.pathname.indexOf("/landing")!==0&&!/bot|crawl|spider|slurp|preview|lighthouse/i.test(navigator.userAgent)){document.documentElement.setAttribute("${SPLASH_ATTR}","")}}catch(e){}`
