export const KHMER_FONT_FAMILY = "'Khmer OS Siemreap', 'Khmer OS', 'Noto Sans Khmer', 'Battambang', sans-serif"

// Shop pages load fresh data on open and when the tab is focused.
// Live updates after an admin save come from storefrontSync, not a timer.
export const STOREFRONT_LIVE_QUERY = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: 'always',
}
