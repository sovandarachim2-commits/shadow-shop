/**
 * Social login (Telegram widget / Google) must not block browsing.
 * Phone + address are collected later on Address Book / Checkout.
 */
export function isSocialProfileIncomplete(_user) {
  return false
}
