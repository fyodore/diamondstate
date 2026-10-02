const API_BASE = ''

function getCookie(name) {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
  return match ? decodeURIComponent(match[2]) : null
}

export async function ensureCsrf() {
  await fetch(`${API_BASE}/api/auth/csrf/`, { credentials: 'include' })
}

export async function api(path, options = {}) {
  const headers = {
    Accept: 'application/json',
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...options.headers,
  }
  const method = (options.method || 'GET').toUpperCase()
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = getCookie('csrftoken')
    if (csrf) headers['X-CSRFToken'] = csrf
  }
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
    body:
      options.body && !(options.body instanceof FormData) && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body,
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  if (!res.ok) {
    const err = new Error(data?.detail || data?.message || res.statusText)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  bytes.forEach((b) => {
    str += String.fromCharCode(b)
  })
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlToBuffer(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  const binary = atob(padded + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function publicKeyCredentialToJSON(cred) {
  if (!cred) return null
  const clientExtensionResults = {}
  try {
    Object.assign(clientExtensionResults, cred.getClientExtensionResults?.() || {})
  } catch {
    /* ignore */
  }
  return {
    id: cred.id,
    rawId: bufferToBase64url(cred.rawId),
    type: cred.type,
    response: {
      clientDataJSON: bufferToBase64url(cred.response.clientDataJSON),
      attestationObject: cred.response.attestationObject
        ? bufferToBase64url(cred.response.attestationObject)
        : undefined,
      authenticatorData: cred.response.authenticatorData
        ? bufferToBase64url(cred.response.authenticatorData)
        : undefined,
      signature: cred.response.signature
        ? bufferToBase64url(cred.response.signature)
        : undefined,
      userHandle: cred.response.userHandle
        ? bufferToBase64url(cred.response.userHandle)
        : undefined,
    },
    clientExtensionResults,
  }
}

export function preparePublicKeyOptions(options) {
  const pk = { ...options }
  pk.challenge = base64urlToBuffer(options.challenge)
  if (pk.user?.id) pk.user = { ...pk.user, id: base64urlToBuffer(pk.user.id) }
  if (pk.excludeCredentials) {
    pk.excludeCredentials = pk.excludeCredentials.map((c) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    }))
  }
  if (pk.allowCredentials) {
    pk.allowCredentials = pk.allowCredentials.map((c) => ({
      ...c,
      id: base64urlToBuffer(c.id),
    }))
  }
  return pk
}
