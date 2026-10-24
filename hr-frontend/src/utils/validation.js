/** Client-side checks that mirror the server's rules, so users get instant feedback. */

export const PATTERNS = {
    employeeCode: /^[A-Za-z0-9_-]{1,30}$/,
    personName: /^[A-Za-z]+(?:[ '.-][A-Za-z]+)*$/,
    phone: /^[6-9][0-9]{9}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    username: /^[A-Za-z0-9._-]{2,50}$/,
    password: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
}

export const MESSAGES = {
    employeeCode: 'Use letters, numbers, hyphens or underscores (max 30).',
    personName: 'Use letters only; spaces, apostrophes, dots and hyphens between words are fine.',
    phone: 'Enter a 10-digit mobile number starting with 6-9.',
    email: 'Enter a valid email address.',
    username: '2-50 characters: letters, numbers, dots, hyphens or underscores.',
    password: '8-64 characters with at least one letter and one number.',
}

const isBlank = (value) => value === null || value === undefined || String(value).trim() === ''

/**
 * Runs a list of rules and returns { field: message } for the first failing
 * rule of each field.
 *
 * rules: { field: [[predicate, message], ...] } where predicate(value, values) => true when valid.
 */
export function validate(values, rules) {
    const errors = {}
    for (const [field, checks] of Object.entries(rules)) {
        for (const [isValid, message] of checks) {
            if (!isValid(values[field], values)) {
                errors[field] = message
                break
            }
        }
    }
    return errors
}

export const required = (message = 'This field is required.') => [(value) => !isBlank(value), message]
export const matches = (pattern, message) => [(value) => isBlank(value) || pattern.test(String(value).trim()), message]
export const maxLength = (max, message = `Use at most ${max} characters.`) => [
    (value) => isBlank(value) || String(value).trim().length <= max,
    message,
]

export function validateEmployee(values, today) {
    return validate(values, {
        employeeCode: [required('Employee code is required.'), matches(PATTERNS.employeeCode, MESSAGES.employeeCode)],
        firstName: [required('First name is required.'), maxLength(50), matches(PATTERNS.personName, MESSAGES.personName)],
        lastName: [required('Last name is required.'), maxLength(50), matches(PATTERNS.personName, MESSAGES.personName)],
        email: [required('Email is required.'), maxLength(100), matches(PATTERNS.email, MESSAGES.email)],
        phone: [required('Phone is required.'), matches(PATTERNS.phone, MESSAGES.phone)],
        dateOfJoining: [
            required('Date of joining is required.'),
            [(value) => isBlank(value) || !today || value <= today, 'Date of joining cannot be in the future.'],
        ],
        departmentId: [required('Choose a department.')],
        designationId: [required('Choose a designation.')],
        status: [required('Choose a status.')],
    })
}

export function validatePasswordPair(password, confirm) {
    const errors = {}
    if (isBlank(password)) {
        errors.password = 'Password is required.'
    } else if (!PATTERNS.password.test(password)) {
        errors.password = MESSAGES.password
    }
    if (password !== confirm) {
        errors.confirmPassword = 'Passwords do not match.'
    }
    return errors
}

export const hasErrors = (errors) => Object.keys(errors).length > 0
