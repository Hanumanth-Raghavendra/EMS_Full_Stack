export const validateEmployee = (form) => {
    const errors = {}

    // Employee Code
    if (!form.employeeCode.trim()) {
        errors.employeeCode = 'Employee code is required.'
    } else if (!/^[A-Za-z0-9_-]+$/.test(form.employeeCode.trim())) {
        errors.employeeCode =
            'Employee code can contain only letters, numbers, _ and -.'
    }

    // First Name
    if (!form.firstName.trim()) {
        errors.firstName = 'First name is required.'
    } else if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(form.firstName.trim())) {
        errors.firstName =
            'First name can contain only letters, spaces, hyphens and apostrophes.'
    }

    // Last Name
    if (!form.lastName.trim()) {
        errors.lastName = 'Last name is required.'
    } else if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(form.lastName.trim())) {
        errors.lastName =
            'Last name can contain only letters, spaces, hyphens and apostrophes.'
    }

    // Email
    if (!form.email.trim()) {
        errors.email = 'Email is required.'
    } else if (
        !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(
            form.email.trim()
        )
    ) {
        errors.email = 'Enter a valid email address.'
    }

    // Phone
    if (!form.phone.trim()) {
        errors.phone = 'Phone number is required.'
    } else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
        errors.phone =
            'Phone number must be a valid 10-digit Indian mobile number.'
    }

    // Date of Joining
    if (!form.dateOfJoining) {
        errors.dateOfJoining = 'Date of joining is required.'
    } else {
        const selectedDate = new Date(form.dateOfJoining)
        const today = new Date()

        selectedDate.setHours(0, 0, 0, 0)
        today.setHours(0, 0, 0, 0)

        if (selectedDate > today) {
            errors.dateOfJoining =
                'Date of joining cannot be in the future.'
        }
    }

    // Department
    if (!form.departmentId) {
        errors.departmentId = 'Department ID is required.'
    } else if (!/^[1-9]\d*$/.test(String(form.departmentId))) {
        errors.departmentId =
            'Department ID must be a positive number.'
    }

    // Designation
    if (!form.designationId) {
        errors.designationId = 'Designation ID is required.'
    } else if (!/^[1-9]\d*$/.test(String(form.designationId))) {
        errors.designationId =
            'Designation ID must be a positive number.'
    }

    // Status
    if (!['ACTIVE', 'INACTIVE'].includes(form.status)) {
        errors.status = 'Invalid employee status.'
    }

    return errors
}