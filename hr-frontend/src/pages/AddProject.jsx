import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

function AddProject() {
    const navigate = useNavigate()

    const [form, setForm] = useState({
        projectName: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'ACTIVE',
    })

    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }))

        setErrors((previous) => ({
            ...previous,
            [name]: '',
        }))

        setError('')
    }

    const validateForm = () => {
        const newErrors = {}

        if (!form.projectName.trim()) {
            newErrors.projectName = 'Project name is required.'
        } else if (form.projectName.trim().length < 2) {
            newErrors.projectName =
                'Project name must contain at least 2 characters.'
        }

        if (!form.startDate) {
            newErrors.startDate = 'Start date is required.'
        }

        if (
            form.startDate &&
            form.endDate &&
            form.endDate < form.startDate
        ) {
            newErrors.endDate =
                'End date cannot be before start date.'
        }

        if (
            !['PLANNED', 'ACTIVE', 'INACTIVE', 'COMPLETED']
                .includes(form.status)
        ) {
            newErrors.status = 'Please select a valid status.'
        }

        return newErrors
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const validationErrors = validateForm()

        setErrors(validationErrors)

        if (Object.keys(validationErrors).length > 0) {
            return
        }

        setLoading(true)
        setError('')

        try {
            await api.post('/api/projects', {
                projectName: form.projectName.trim(),
                description: form.description.trim(),
                startDate: form.startDate,
                endDate: form.endDate || null,
                status: form.status,
            })

            navigate('/projects')
        } catch (err) {
            console.error(err)

            if (
                err.response?.status === 401 ||
                err.response?.status === 403
            ) {
                localStorage.removeItem('jwt')
                navigate('/')
                return
            }

            setError(
                err.response?.data?.message ||
                'Unable to create project.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1>Add Project</h1>
                    <p>Create a new project record.</p>
                </div>

                <button
                    className="secondary-button"
                    onClick={() => navigate('/projects')}
                >
                    Back to Projects
                </button>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <div className="form-card">
                <form onSubmit={handleSubmit} noValidate>

                    <div className="form-grid">

                        <div className="form-group">
                            <label>Project Name</label>
                            <input
                                type="text"
                                name="projectName"
                                value={form.projectName}
                                onChange={handleChange}
                                placeholder="Enter project name"
                                maxLength={100}
                                required
                            />

                            {errors.projectName && (
                                <small className="field-error">
                                    {errors.projectName}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                placeholder="Enter project description"
                                rows="4"
                                maxLength={500}
                            />
                        </div>

                        <div className="form-group">
                            <label>Start Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={form.startDate}
                                onChange={handleChange}
                                required
                            />

                            {errors.startDate && (
                                <small className="field-error">
                                    {errors.startDate}
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>End Date</label>
                            <input
                                type="date"
                                name="endDate"
                                value={form.endDate}
                                onChange={handleChange}
                            />

                            {errors.endDate && (
                                <small className="field-error">
                                    {errors.endDate}
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
                                <option value="PLANNED">
                                    PLANNED
                                </option>

                                <option value="ACTIVE">
                                    ACTIVE
                                </option>

                                <option value="INACTIVE">
                                    INACTIVE
                                </option>

                                <option value="COMPLETED">
                                    COMPLETED
                                </option>
                            </select>
                        </div>

                    </div>

                    <div className="form-actions">

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => navigate('/projects')}
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
                                : 'Create Project'}
                        </button>

                    </div>

                </form>
            </div>
        </div>
    )
}

export default AddProject