export function validateEmployeeForm(form) {
    const errors = {}
    const code = form.employeeCode.trim()
    const first = form.firstName.trim()
    const last = form.lastName.trim()
    const email = form.email.trim()
    const phone = form.phone.trim()

    if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) {
        errors.employeeCode = 'Use only letters, numbers, hyphens or underscores.'
    }
    if (!first || !/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(first)) {
        errors.firstName = 'Enter a valid first name.'
    }
    if (!last || !/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(last)) {
        errors.lastName = 'Enter a valid last name.'
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        errors.email = 'Enter a valid email address.'
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
        errors.phone = 'Enter a valid 10-digit mobile number.'
    }
    if (!form.dateOfJoining) {
        errors.dateOfJoining = 'Select the date of joining.'
    }
    if (!form.departmentId) {
        errors.departmentId = 'Select a department.'
    }
    if (!form.designationId) {
        errors.designationId = 'Select a designation.'
    }
    if (!['ACTIVE', 'INACTIVE'].includes(form.status)) {
        errors.status = 'Select a valid status.'
    }
    return errors
}
