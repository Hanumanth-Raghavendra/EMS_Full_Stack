import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { validateEmployeeForm } from '../utils/employeeValidation'

function AddEmployee() {
    const navigate = useNavigate()

    const [departments, setDepartments] = useState([])
    const [designations, setDesignations] = useState([])

    const [form, setForm] = useState({
        employeeCode: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfJoining: '',
        departmentId: '',
        designationId: '',
        status: 'ACTIVE',
    })

    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const loadDepartments = async () => {
            try {
                const response = await api.get('/api/departments')
                setDepartments(response.data)
            } catch (err) {
                console.error(err)
                setError('Unable to load departments.')
            }
        }

        loadDepartments()
    }, [])

    useEffect(() => {
        const loadDesignations = async () => {
            if (!form.departmentId) {
                setDesignations([])
                return
            }

            try {
                const response = await api.get(
                    `/api/designations/department/${form.departmentId}`
                )

                setDesignations(response.data)
            } catch (err) {
                console.error(err)
                setDesignations([])
                setError('Unable to load designations.')
            }
        }

        loadDesignations()
    }, [form.departmentId])

    const handleChange = (e) => {
        const { name, value } = e.target

        if (name === 'departmentId') {
            setForm((previous) => ({
                ...previous,
                departmentId: value,
                designationId: '',
            }))

            setErrors((previous) => ({
                ...previous,
                departmentId: '',
                designationId: '',
            }))

            return
        }

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        setError('')

        const validationErrors = validateEmployeeForm(form)

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            return
        }

        setErrors({})
        setLoading(true)

        try {
            await api.post('/api/employees', {
                employeeCode: form.employeeCode.trim(),
                firstName: form.firstName.trim(),
                lastName: form.lastName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                dateOfJoining: form.dateOfJoining,
                departmentId: Number(form.departmentId),
                designationId: Number(form.designationId),
                status: form.status,
            })

            navigate('/employees')
        } catch (err) {
            console.error(err)

            if (err.response?.status === 403) {
                setError(
                    'You do not have permission to create employees.'
                )
            } else {
                setError(
                    err.response?.data?.message ||
                    'Unable to create employee.'
                )
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1>Add Employee</h1>
                    <p>Create a new employee record.</p>
                </div>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => navigate('/employees')}
                >
                    Back to Employees
                </button>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <div className="form-card">

                <form onSubmit={handleSubmit}>

                    <div className="form-grid">

                        <div className="form-group">
                            <label>Employee Code</label>

                            <input
                                type="text"
                                name="employeeCode"
                                value={form.employeeCode}
                                onChange={handleChange}
                                placeholder="e.g. EMP001"
                                required
                            />

                            {errors.employeeCode && (
                                <small className="field-error">
                                    {errors.employeeCode}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>First Name</label>

                            <input
                                type="text"
                                name="firstName"
                                value={form.firstName}
                                onChange={handleChange}
                                maxLength={50}
                                required
                            />

                            {errors.firstName && (
                                <small className="field-error">
                                    {errors.firstName}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Last Name</label>

                            <input
                                type="text"
                                name="lastName"
                                value={form.lastName}
                                onChange={handleChange}
                                maxLength={50}
                                required
                            />

                            {errors.lastName && (
                                <small className="field-error">
                                    {errors.lastName}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Email</label>

                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="example@gmail.com"
                                required
                            />

                            {errors.email && (
                                <small className="field-error">
                                    {errors.email}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Phone</label>

                            <input
                                type="text"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="10-digit mobile number"
                                inputMode="numeric"
                                maxLength={10}
                                required
                            />

                            {errors.phone && (
                                <small className="field-error">
                                    {errors.phone}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Date of Joining</label>

                            <input
                                type="date"
                                name="dateOfJoining"
                                value={form.dateOfJoining}
                                onChange={handleChange}
                                required
                            />

                            {errors.dateOfJoining && (
                                <small className="field-error">
                                    {errors.dateOfJoining}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Department</label>

                            <select
                                name="departmentId"
                                value={form.departmentId}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Select department
                                </option>

                                {departments.map((department) => (
                                    <option
                                        key={department.departmentId}
                                        value={department.departmentId}
                                    >
                                        {department.departmentName}
                                    </option>
                                ))}
                            </select>

                            {errors.departmentId && (
                                <small className="field-error">
                                    {errors.departmentId}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Designation</label>

                            <select
                                name="designationId"
                                value={form.designationId}
                                onChange={handleChange}
                                disabled={!form.departmentId}
                                required
                            >
                                <option value="">
                                    {form.departmentId
                                        ? 'Select designation'
                                        : 'Select department first'}
                                </option>

                                {designations.map((designation) => (
                                    <option
                                        key={designation.designationId}
                                        value={designation.designationId}
                                    >
                                        {designation.designationName}
                                    </option>
                                ))}
                            </select>

                            {errors.designationId && (
                                <small className="field-error">
                                    {errors.designationId}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Status</label>

                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                            >
                                <option value="ACTIVE">
                                    ACTIVE
                                </option>

                                <option value="INACTIVE">
                                    INACTIVE
                                </option>
                            </select>
                        </div>

                    </div>

                    <div className="form-actions">

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => navigate('/employees')}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={loading}
                        >
                            {loading
                                ? 'Creating...'
                                : 'Create Employee'}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    )
}

export default AddEmployee