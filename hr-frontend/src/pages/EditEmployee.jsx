import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import { validateEmployeeForm } from '../utils/employeeValidation'

function EditEmployee() {
    const { employeeId } = useParams()
    const navigate = useNavigate()
    const role = useSelector((state) => state.auth.role)
    const isEmployee = role === 'EMPLOYEE'

    const [form, setForm] = useState(null)
    const [departments, setDepartments] = useState([])
    const [designations, setDesignations] = useState([])
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const loadEmployee = async () => {
            try {
                const employeeResponse = await api.get(
                    `/api/employees/${employeeId}`
                )

                const employee = employeeResponse.data
                let departmentList = []
                let designationList = []

                const departmentId =
                    employee.department?.departmentId ??
                    employee.departmentId ??
                    ''

                const designationId =
                    employee.designation?.designationId ??
                    employee.designationId ??
                    ''

                if (!isEmployee) {
                    const departmentsResponse = await api.get(
                        '/api/departments'
                    )
                    departmentList = departmentsResponse.data

                    if (departmentId) {
                        const designationsResponse = await api.get(
                            `/api/designations/department/${departmentId}`
                        )

                        designationList = designationsResponse.data
                    }
                }

                setForm({
                    employeeCode: employee.employeeCode || '',
                    firstName: employee.firstName || '',
                    lastName: employee.lastName || '',
                    email: employee.email || '',
                    phone: employee.phone || '',
                    dateOfJoining: employee.dateOfJoining || '',
                    departmentId,
                    designationId,
                    status: employee.status || 'ACTIVE',
                })

                setDepartments(departmentList)
                setDesignations(designationList)
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'Unable to load employee.'
                )
            }
        }

        loadEmployee()
    }, [employeeId, isEmployee])

    if (!form) {
        return (
            <div className="page-container">
                <p className="loading">
                    {error || 'Loading employee...'}
                </p>
            </div>
        )
    }

    const change = (name, value) => {
        console.log('FIELD CHANGED:', name, value)
        setForm({
            ...form,
            [name]: value,
        })

        setErrors({
            ...errors,
            [name]: '',
        })
    }

    const handleDepartmentChange = async (value) => {
        setForm({
            ...form,
            departmentId: value,
            designationId: '',
        })

        setErrors({
            ...errors,
            departmentId: '',
            designationId: '',
        })

        if (!value) {
            setDesignations([])
            return
        }

        try {
            const response = await api.get(
                `/api/designations/department/${value}`
            )

            setDesignations(response.data)
        } catch (err) {
            setDesignations([])
            setError(
                err.response?.data?.message ||
                'Unable to load designations.'
            )
        }
    }

    const submit = async (event) => {
        event.preventDefault()

        const validationErrors =
            validateEmployeeForm(form)

        setErrors(validationErrors)

        if (Object.keys(validationErrors).length) {
            return
        }

        setSaving(true)
        setError('')

        try {
            await api.put(
                `/api/employees/${employeeId}`,
                {
                    ...form,
                    employeeCode:
                        form.employeeCode.trim(),
                    firstName:
                        form.firstName.trim(),
                    lastName:
                        form.lastName.trim(),
                    email:
                        form.email.trim(),
                    phone:
                        form.phone.trim(),
                    departmentId:
                        Number(form.departmentId),
                    designationId:
                        Number(form.designationId),
                }
            )

            navigate('/employees')
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to update employee.'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <EditForm
            form={form}
            departments={departments}
            designations={designations}
            errors={errors}
            error={error}
            saving={saving}
            onChange={change}
            onDepartmentChange={handleDepartmentChange}
            onSubmit={submit}
            onCancel={() => navigate('/employees')}
            isEmployee={isEmployee}
        />
    )
}

function EditForm({
    form,
    departments,
    designations,
    errors,
    error,
    saving,
    onChange,
    onDepartmentChange,
    onSubmit,
    onCancel,
    isEmployee,
}) {
    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>{isEmployee ? 'My Profile' : 'Edit Employee'}</h1>
                    <p>{isEmployee ? 'Update your contact details.' : 'Update employee record.'}</p>
                </div>

                <button
                    className="secondary-button"
                    onClick={onCancel}
                >
                    Back
                </button>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <div className="form-card">
                <form
                    onSubmit={onSubmit}
                    noValidate
                >
                    <div className="form-grid">
                        <F
                            l="Employee Code"
                            n="employeeCode"
                            f={form}
                            c={onChange}
                            e={errors.employeeCode}
                            disabled={isEmployee}
                        />

                        <F
                            l="First Name"
                            n="firstName"
                            f={form}
                            c={onChange}
                            e={errors.firstName}
                            disabled={isEmployee}
                        />

                        <F
                            l="Last Name"
                            n="lastName"
                            f={form}
                            c={onChange}
                            e={errors.lastName}
                            disabled={isEmployee}
                        />

                        <F
                            l="Email"
                            n="email"
                            type="email"
                            f={form}
                            c={onChange}
                            e={errors.email}
                        />

                        <F
                            l="Mobile Number"
                            n="phone"
                            f={form}
                            c={onChange}
                            e={errors.phone}
                            inputMode="numeric"
                            maxLength={10}
                        />

                        <F
                            l="Date of Joining"
                            n="dateOfJoining"
                            type="date"
                            f={form}
                            c={onChange}
                            e={errors.dateOfJoining}
                            disabled={isEmployee}
                        />

                        <S
                            l="Department"
                            n="departmentId"
                            f={form}
                            c={onDepartmentChange}
                            e={errors.departmentId}
                            o={departments.map((department) => ({
                                value: department.departmentId,
                                label: department.departmentName,
                            }))}
                            disabled={isEmployee}
                        />

                        <S
                            l="Designation"
                            n="designationId"
                            f={form}
                            c={(value) => onChange('designationId', value)}
                            e={errors.designationId}
                            o={designations.map((designation) => ({
                                value:
                                    designation.designationId,
                                label:
                                    designation.designationName,
                            }))}
                            disabled={isEmployee}
                        />

                        <S
                            l="Status"
                            n="status"
                            f={form}
                            c={(value) => onChange('status', value)}
                            o={[
                                {
                                    value: 'ACTIVE',
                                    label: 'ACTIVE',
                                },
                                {
                                    value: 'INACTIVE',
                                    label: 'INACTIVE',
                                },
                            ]}
                            disabled={isEmployee}
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>

                        <button
                            className="primary-button"
                            disabled={saving}
                        >
                            {saving
                                ? 'Saving...'
                                : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function F({
    l,
    n,
    f,
    c,
    e,
    type = 'text',
    ...props
}) {
    return (
        <div className="form-group">
            <label>{l}</label>

            <input
                type={type}
                value={f[n]}
                onChange={(event) =>
                    c(
                        n,
                        n === 'phone'
                            ? event.target.value
                                .replace(/\D/g, '')
                                .slice(0, 10)
                            : event.target.value
                    )
                }
                {...props}
            />

            {e && (
                <small className="field-error">
                    {e}
                </small>
            )}
        </div>
    )
}

function S({
    l,
    n,
    f,
    c,
    e,
    o,
    disabled,
}) {
    return (
        <div className="form-group">
            <label>{l}</label>

            <select
                value={f[n]}
                disabled={disabled}
                onChange={(event) =>
                    c(event.target.value)
                }
            >
                <option value="">
                    Select {l.toLowerCase()}
                </option>

                {o.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>

            {e && (
                <small className="field-error">
                    {e}
                </small>
            )}
        </div>
    )
}

export default EditEmployee