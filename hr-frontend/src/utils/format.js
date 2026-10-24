const LOCALE = 'en-IN'

function parseDate(value) {
    if (!value) {
        return null
    }
    if (value instanceof Date) {
        return value
    }
    // Plain dates ("2026-06-10") are calendar dates, not UTC instants.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split('-').map(Number)
        return new Date(year, month - 1, day)
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
}

/** 10 Jun 2026 */
export function formatDate(value) {
    const date = parseDate(value)
    return date
        ? date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })
        : '—'
}

/** Wed, 10 Jun */
export function formatShortDate(value) {
    const date = parseDate(value)
    return date ? date.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }) : '—'
}

/** Wednesday, 10 June */
export function formatLongDate(value) {
    const date = parseDate(value)
    return date ? date.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }) : '—'
}

/** 09:05 */
export function formatTime(value) {
    const date = parseDate(value)
    return date
        ? date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false })
        : '—'
}

/** 10 Jun 2026, 09:05 */
export function formatDateTime(value) {
    const date = parseDate(value)
    return date ? `${formatDate(date)}, ${formatTime(date)}` : '—'
}

/**
 * Compact date range: "4–10 Nov 2026", "31 Oct – 3 Nov 2026", or a single
 * date when start and end are the same day.
 */
export function formatDateRange(start, end) {
    const from = parseDate(start)
    const to = parseDate(end || start)
    if (!from || !to) {
        return '—'
    }
    if (from.getTime() === to.getTime()) {
        return formatDate(from)
    }
    const sameYear = from.getFullYear() === to.getFullYear()
    const sameMonth = sameYear && from.getMonth() === to.getMonth()
    if (sameMonth) {
        return `${from.getDate()}–${formatDate(to)}`
    }
    if (sameYear) {
        return `${from.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })} – ${formatDate(to)}`
    }
    return `${formatDate(from)} – ${formatDate(to)}`
}

/** 545 -> "9h 05m" */
export function formatMinutes(minutes) {
    if (minutes === null || minutes === undefined) {
        return '—'
    }
    const hours = Math.floor(minutes / 60)
    const rest = String(minutes % 60).padStart(2, '0')
    return hours > 0 ? `${hours}h ${rest}m` : `${minutes}m`
}

/** Date -> "2026-06-10" in local time. */
export function toIsoDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function addDays(isoDate, days) {
    const date = parseDate(isoDate)
    date.setDate(date.getDate() + days)
    return toIsoDate(date)
}

/** Working days (Mon-Fri) between two ISO dates, inclusive. Mirrors the server rule. */
export function countWorkingDays(start, end) {
    const from = parseDate(start)
    const to = parseDate(end)
    if (!from || !to || to < from) {
        return 0
    }
    let count = 0
    for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
        const weekday = day.getDay()
        if (weekday !== 0 && weekday !== 6) {
            count += 1
        }
    }
    return count
}

/** "08:30" from an ISO date-time. */
export function timePart(value) {
    if (!value) {
        return ''
    }
    const match = String(value).match(/T(\d{2}:\d{2})/)
    return match ? match[1] : ''
}

export function greeting(date = new Date()) {
    const hour = date.getHours()
    if (hour < 12) {
        return 'Good morning'
    }
    if (hour < 17) {
        return 'Good afternoon'
    }
    return 'Good evening'
}

export function pluralize(count, singular, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`
}
