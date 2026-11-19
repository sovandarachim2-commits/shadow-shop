export function variantKey(size, color) {
  return JSON.stringify([size, color].map((value) => value.trim().replace(/\s+/g, ' ').toLowerCase()))
}
