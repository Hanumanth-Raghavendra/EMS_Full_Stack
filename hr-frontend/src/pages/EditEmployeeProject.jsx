import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'

function EditEmployeeProject() {
    const { employeeId, projectId } = useParams()
    const navigate = useNavigate()

    const [employee, setEmployee] = useState(null)
    const [project, setProject] = useState(null)

    const [form, setForm] = useState({
        assignedAt: '',
        roleInProject: '',
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadAssignment = async () => {
            try {
                const response = await api.get(
                    `/api/employee-projects/${employeeId}/${projectId}`
                )

                const assignment = response.data

                setEmployee({
                    employeeId: assignment.employeeId,
                    employeeName: assignment.employeeName,
                })

                setProject({
                    projectId: assignment.projectId,
                    projectName: assignment.projectName,
                })

                setForm({
                    assignedAt: assignment.assignedAt
                        ? assignment.assignedAt.slice(0, 16)
                        : '',
                    roleInProject:
                        assignment.roleInProject || '',
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

                setError('Unable to load assignment.')
            } finally {
                setLoading(false)
            }
        }

        loadAssignment()
    }, [employeeId, projectId, navigate])

    const handleChange = (e) => {
        const { name, value } = e.target

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!form.roleInProject.trim()) {
            setError('Please enter the role in project.')
            return
        }

        setSaving(true)
        setError('')

        try {
            await api.put(
                `/api/employee-projects/${employeeId}/${projectId}`,
                {
                    employeeId: Number(employeeId),
                    projectId: Number(projectId),
                    assignedAt: form.assignedAt
                        ? new Date(form.assignedAt).toISOString()
                        : null,
                    roleInProject: form.roleInProject.trim(),
                }
            )

            navigate('/employee-projects')
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
                'Unable to update assignment.'
            )
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading assignment...</p>
            </div>
        )
    }

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1>Edit Assignment</h1>
                    <p>Update employee project assignment.</p>
                </div>

                <button
                    className="secondary-button"
                    onClick={() => navigate('/employee-projects')}
                >
                    Back to Assignments
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
                            <label>Employee</label>
                            <input
                                type="text"
                                value={
                                    employee?.employeeName || ''
                                }
                                disabled
                            />
                        </div>

                        <div className="form-group">
                            <label>Project</label>
                            <input
                                type="text"
                                value={
                                    project?.projectName || ''
                                }
                                disabled
                            />
                        </div>

                        <div className="form-group">
                            <label>Assigned At</label>
                            <input
                                type="datetime-local"
                                name="assignedAt"
                                value={form.assignedAt}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Role in Project</label>
                            <input
                                type="text"
                                name="roleInProject"
                                value={form.roleInProject}
                                onChange={handleChange}
                                required
                            />
                        </div>

                    </div>

                    <div className="form-actions">

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                                navigate('/employee-projects')
                            }
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

export default EditEmployeeProject
