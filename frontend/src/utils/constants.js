export const KHMER_FONT_FAMILY = "'Noto Sans Khmer', 'Khmer OS Battambang', 'Khmer OS', sans-serif"

export const KHMER_TEXT_STYLE = {
  fontFamily: KHMER_FONT_FAMILY,
  fontWeight: 400,
  fontSynthesis: 'none',
}

// Shop pages load fresh data on open and when the tab is focused.
// Live updates after an admin save come from storefrontSync, not a timer.
export const STOREFRONT_LIVE_QUERY = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: 'always',
}
