import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'

function EditProject() {
    const { projectId } = useParams()
    const navigate = useNavigate()

    const [form, setForm] = useState({
        projectName: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'ACTIVE',
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')

    useEffect(() => {
        const loadProject = async () => {
            try {
                const response = await api.get(
                    `/api/projects/${projectId}`
                )

                const project = response.data

                setForm({
                    projectName: project.projectName || '',
                    description: project.description || '',
                    startDate: project.startDate || '',
                    endDate: project.endDate || '',
                    status: project.status || 'ACTIVE',
                })
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

                setError('Unable to load project details.')
            } finally {
                setLoading(false)
            }
        }

        loadProject()
    }, [projectId, navigate])

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

        return newErrors
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const validationErrors = validateForm()

        setErrors(validationErrors)

        if (Object.keys(validationErrors).length > 0) {
            return
        }

        setSaving(true)
        setError('')

        try {
            await api.put(`/api/projects/${projectId}`, {
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
                'Unable to update project.'
            )
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading project...</p>
            </div>
        )
    }

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1>Edit Project</h1>
                    <p>
                        Update project #{projectId}.
                    </p>
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
                                <option value="PLANNED">PLANNED</option>
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                                <option value="COMPLETED">COMPLETED</option>
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

export default EditProject