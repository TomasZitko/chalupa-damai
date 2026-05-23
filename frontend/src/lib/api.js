const API_BASE = import.meta.env.VITE_API_URL ?? ''

const TOKEN_KEY = 'damai_admin_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

async function apiClient(endpoint, options = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.message ?? body.error ?? `HTTP ${res.status}`)
    err.status = res.status
    err.body = body
    throw err
  }

  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ── Public ────────────────────────────────────────────────

/** Returns array of { date_from: string, date_to: string } */
export function getBlockedDates(slug) {
  return apiClient(`/api/availability/${slug}`)
}

/** Submit a guest reservation */
export function submitBooking({ propertySlug, checkIn, checkOut, guestName, guestEmail, guestPhone, guestCount, notes }) {
  return apiClient('/api/reservations', {
    method: 'POST',
    body: JSON.stringify({
      property_slug: propertySlug,
      check_in:      checkIn,
      check_out:     checkOut,
      guest_name:    guestName,
      guest_email:   guestEmail,
      guest_phone:   guestPhone,
      guests_count:  guestCount,
      notes,
    }),
  })
}

// ── Auth ─────────────────────────────────────────────────

export async function adminLogin(password) {
  const data = await apiClient('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  localStorage.setItem(TOKEN_KEY, data.token)
  return data
}

export function adminLogout() {
  localStorage.removeItem(TOKEN_KEY)
}

export function isAuthenticated() {
  const token = getToken()
  if (!token) return false
  try {
    // Decode payload without verifying signature — just check expiry client-side
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(b64))
    return typeof exp === 'number' && exp * 1000 > Date.now()
  } catch {
    return false
  }
}

// ── Admin ─────────────────────────────────────────────────

export function getReservations() {
  return apiClient('/api/admin/reservations')
}

export function updateReservationStatus(id, status) {
  return apiClient(`/api/admin/reservations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export function getIcalFeeds() {
  return apiClient('/api/admin/feeds')
}

export function addIcalFeed({ platform, url }) {
  return apiClient('/api/admin/feeds', {
    method: 'POST',
    body: JSON.stringify({ platform_name: platform, feed_url: url }),
  })
}

export function deleteIcalFeed(id) {
  return apiClient(`/api/admin/feeds/${id}`, { method: 'DELETE' })
}

export function syncIcalFeed(id) {
  return apiClient(`/api/admin/feeds/${id}/sync`, { method: 'POST' })
}

export function deleteReservation(id) {
  return apiClient(`/api/admin/reservations/${id}`, { method: 'DELETE' })
}
