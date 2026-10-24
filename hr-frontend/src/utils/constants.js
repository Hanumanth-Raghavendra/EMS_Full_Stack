export const ROLES = {
    ADMIN: 'ADMIN',
    HR: 'HR',
    EMPLOYEE: 'EMPLOYEE',
}

export const ROLE_LABELS = {
    ADMIN: 'Administrator',
    HR: 'HR',
    EMPLOYEE: 'Employee',
}

/** Roles the signed-in user may grant: HR can only create employee accounts. */
export function assignableRoles(isAdmin) {
    const roles = isAdmin ? [ROLES.EMPLOYEE, ROLES.HR, ROLES.ADMIN] : [ROLES.EMPLOYEE]
    return roles.map((role) => ({ value: role, label: ROLE_LABELS[role] }))
}

export const EMPLOYEE_STATUSES = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
]

export const ATTENDANCE_STATUSES = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'HALF_DAY', label: 'Half day' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'LEAVE', label: 'On leave' },
]

export const LEAVE_STATUSES = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' },
]

export const LEAVE_TYPES = [
    { value: 'CASUAL', label: 'Casual' },
    { value: 'SICK', label: 'Sick' },
    { value: 'EARNED', label: 'Earned' },
    { value: 'UNPAID', label: 'Unpaid' },
]

export const PROJECT_STATUSES = [
    { value: 'PLANNED', label: 'Planned' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'On hold' },
    { value: 'COMPLETED', label: 'Completed' },
]

/** Colour tone for every status value used in the app. */
export const STATUS_TONES = {
    ACTIVE: 'good',
    INACTIVE: 'neutral',
    PRESENT: 'good',
    HALF_DAY: 'warn',
    ABSENT: 'bad',
    LEAVE: 'info',
    PENDING: 'pending',
    APPROVED: 'good',
    REJECTED: 'bad',
    CANCELLED: 'neutral',
    PLANNED: 'info',
    COMPLETED: 'neutral',
    ENABLED: 'good',
    DISABLED: 'bad',
}

const ALL_LABELS = [
    ...EMPLOYEE_STATUSES,
    ...ATTENDANCE_STATUSES,
    ...LEAVE_STATUSES,
    ...LEAVE_TYPES,
    ...PROJECT_STATUSES,
]

/** "HALF_DAY" -> "Half day" (falls back to a readable version of the value). */
export function labelFor(value) {
    if (value === null || value === undefined || value === '') {
        return ''
    }
    const match = ALL_LABELS.find((item) => item.value === value)
    if (match) {
        return match.label
    }
    const text = String(value).replace(/_/g, ' ').toLowerCase()
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export const ATTENDANCE_COLORS = {
    PRESENT: '#2F7D4F',
    HALF_DAY: '#C6862A',
    ABSENT: '#B42318',
    LEAVE: '#4F55C9',
    NOT_MARKED: '#C9D1CD',
}
