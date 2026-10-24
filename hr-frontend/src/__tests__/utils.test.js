import { describe, expect, it } from 'vitest'
import { assignableRoles, labelFor } from '../utils/constants'
import {
    addDays,
    countWorkingDays,
    formatDateRange,
    formatMinutes,
    timePart,
} from '../utils/format'
import { returnPath } from '../utils/returnPath'
import { MESSAGES, hasErrors, validateEmployee, validatePasswordPair } from '../utils/validation'

const validEmployee = {
    employeeCode: 'EMP-01',
    firstName: "D'Souza",
    lastName: 'Kumar',
    email: 'ravi@example.com',
    phone: '9876543210',
    dateOfJoining: '2026-01-05',
    departmentId: 1,
    designationId: 2,
    status: 'ACTIVE',
}

describe('validateEmployee', () => {
    it('accepts a valid employee', () => {
        expect(validateEmployee(validEmployee, '2026-06-10')).toEqual({})
    })

    it('reports every invalid field with a specific message', () => {
        const errors = validateEmployee(
            { ...validEmployee, employeeCode: 'EMP 01', firstName: 'R4vi', email: 'nope', phone: '12345', departmentId: '' },
            '2026-06-10'
        )
        expect(errors.employeeCode).toBe(MESSAGES.employeeCode)
        expect(errors.firstName).toBe(MESSAGES.personName)
        expect(errors.email).toBe(MESSAGES.email)
        expect(errors.phone).toBe(MESSAGES.phone)
        expect(errors.departmentId).toBe('Choose a department.')
    })

    it('rejects a joining date in the future', () => {
        expect(validateEmployee({ ...validEmployee, dateOfJoining: '2026-07-01' }, '2026-06-10').dateOfJoining).toMatch(
            /future/
        )
    })
})

describe('validatePasswordPair', () => {
    it('needs a letter and a number and matching confirmation', () => {
        expect(validatePasswordPair('password', 'password').password).toBe(MESSAGES.password)
        expect(validatePasswordPair('Passw0rd', 'Passw0rd!').confirmPassword).toBe('Passwords do not match.')
        expect(hasErrors(validatePasswordPair('Passw0rd', 'Passw0rd'))).toBe(false)
    })
})

describe('format helpers', () => {
    it('counts working days like the server (weekends excluded)', () => {
        expect(countWorkingDays('2026-06-15', '2026-06-21')).toBe(5)
        expect(countWorkingDays('2026-06-13', '2026-06-14')).toBe(0)
        expect(countWorkingDays('2026-06-19', '2026-06-15')).toBe(0)
    })

    it('formats durations and ranges', () => {
        expect(formatMinutes(545)).toBe('9h 05m')
        expect(formatMinutes(45)).toBe('45m')
        expect(formatMinutes(null)).toBe('—')
        expect(formatDateRange('2026-11-04', '2026-11-10')).toBe('4–10 Nov 2026')
        expect(formatDateRange('2026-06-15', '2026-06-15')).toBe('15 Jun 2026')
        expect(formatDateRange('2026-10-31', '2026-11-03')).toBe('31 Oct – 3 Nov 2026')
    })

    it('extracts times and moves dates', () => {
        expect(timePart('2026-06-10T09:05:00')).toBe('09:05')
        expect(timePart(null)).toBe('')
        expect(addDays('2026-02-27', 2)).toBe('2026-03-01')
    })
})

describe('returnPath', () => {
    it('returns to the requested page for a fresh sign-in or the same person', () => {
        expect(returnPath('/leave?tab=mine', null, 'ravi')).toBe('/leave?tab=mine')
        expect(returnPath('/leave', 'Ravi', 'ravi')).toBe('/leave')
    })

    it('starts a different person on the dashboard', () => {
        expect(returnPath('/audit-logs', 'admin', 'ravi')).toBe('/dashboard')
    })

    it('ignores missing, external or login targets', () => {
        expect(returnPath(undefined, null, 'ravi')).toBe('/dashboard')
        expect(returnPath('https://evil.example', null, 'ravi')).toBe('/dashboard')
        expect(returnPath('//evil.example', null, 'ravi')).toBe('/dashboard')
        expect(returnPath('/login', null, 'ravi')).toBe('/dashboard')
    })
})

describe('labels and roles', () => {
    it('turns enum values into sentence-case labels', () => {
        expect(labelFor('HALF_DAY')).toBe('Half day')
        expect(labelFor('LEAVE')).toBe('On leave')
        expect(labelFor('SOMETHING_NEW')).toBe('Something new')
    })

    it('lets HR grant only the employee role', () => {
        expect(assignableRoles(false).map((role) => role.value)).toEqual(['EMPLOYEE'])
        expect(assignableRoles(true).map((role) => role.value)).toEqual(['EMPLOYEE', 'HR', 'ADMIN'])
    })
})
