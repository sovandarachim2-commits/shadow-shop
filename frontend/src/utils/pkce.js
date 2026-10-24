function randomUrlSafe(size = 32) {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  let binary = ''
  bytes.forEach((value) => {
    binary += String.fromCharCode(value)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export async function createPkcePair() {
  const verifier = randomUrlSafe(32)
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  let binary = ''
  new Uint8Array(digest).forEach((value) => {
    binary += String.fromCharCode(value)
  })
  const challenge = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return { verifier, challenge }
}

export function encodeState(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  bytes.forEach((item) => {
    binary += String.fromCharCode(item)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function decodeState(value) {
  try {
    let text = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
    const pad = text.length % 4
    if (pad) text += '='.repeat(4 - pad)
    const binary = atob(text)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}
