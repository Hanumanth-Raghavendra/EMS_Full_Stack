import axios from 'axios'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '')

/** Fired when the server rejects our token so the app can sign out. */
export const SESSION_EXPIRED_EVENT = 'ems:session-expired'

let readToken = () => null

/** The store registers how to read the current token (avoids a circular import). */
export function setTokenReader(reader) {
    readToken = reader
}

const api = axios.create({
    baseURL: API_URL,
    // Free hosting tiers can take ~50s to wake up, so be patient.
    timeout: 70000,
    headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
    const token = readToken()
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status
        const url = error.config?.url || ''
        const isAuthCall = url.includes('/api/auth/login') || url.includes('/api/setup/')
        if (status === 401 && !isAuthCall && readToken()) {
            window.dispatchEvent(
                new CustomEvent(SESSION_EXPIRED_EVENT, {
                    detail: error.response?.data?.message,
                })
            )
        }
        return Promise.reject(error)
    }
)

/** A human readable message for any failed request. */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
    if (!error) {
        return fallback
    }
    const message = error.response?.data?.message
    if (message) {
        return message
    }
    if (error.code === 'ECONNABORTED') {
        return 'The server took too long to respond. Please try again.'
    }
    if (error.request && !error.response) {
        return 'Cannot reach the server. Check your connection and try again.'
    }
    if (error.response?.status === 403) {
        return 'You do not have permission to do that.'
    }
    return fallback
}

/** Field-level messages returned by the API, keyed by field name. */
export function getFieldErrors(error) {
    return error?.response?.data?.fieldErrors || {}
}

export default api
