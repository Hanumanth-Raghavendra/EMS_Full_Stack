import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

function AddEmployeeProject() {
    const navigate = useNavigate()

    const [employees, setEmployees] = useState([])
    const [projects, setProjects] = useState([])

    const [form, setForm] = useState({
        employeeId: '',
        projectId: '',
        assignedAt: '',
        roleInProject: '',
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadData = async () => {
            try {
                const [employeeResponse, projectResponse] =
                    await Promise.all([
                        api.get('/api/employees'),
                        api.get('/api/projects'),
                    ])

                setEmployees(employeeResponse.data)
                setProjects(projectResponse.data)
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

                setError('Unable to load employees and projects.')
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [navigate])

    const handleChange = (e) => {
        const { name, value } = e.target

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        setError('')

        if (!form.employeeId) {
            setError('Please select an employee.')
            return
        }

        if (!form.projectId) {
            setError('Please select a project.')
            return
        }

        if (!form.roleInProject.trim()) {
            setError('Please enter the role in project.')
            return
        }

        setSaving(true)

        try {
            await api.post('/api/employee-projects', {
                employeeId: Number(form.employeeId),
                projectId: Number(form.projectId),
                assignedAt: form.assignedAt
                    ? new Date(form.assignedAt).toISOString()
                    : null,
                roleInProject: form.roleInProject.trim(),
            })

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
                'Unable to assign employee to project.'
            )
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading...</p>
            </div>
        )
    }

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1>Assign Employee</h1>
                    <p>Assign an employee to a project.</p>
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

                            <select
                                name="employeeId"
                                value={form.employeeId}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Select employee
                                </option>

                                {employees.map((employee) => (
                                    <option
                                        key={employee.employeeId}
                                        value={employee.employeeId}
                                    >
                                        {employee.firstName}{' '}
                                        {employee.lastName}
                                        {' — '}
                                        {employee.employeeCode}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Project</label>

                            <select
                                name="projectId"
                                value={form.projectId}
                                onChange={handleChange}
                                required
                            >
                                <option value="">
                                    Select project
                                </option>

                                {projects.map((project) => (
                                    <option
                                        key={project.projectId}
                                        value={project.projectId}
                                    >
                                        {project.projectName}
                                    </option>
                                ))}
                            </select>
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
                                placeholder="e.g. Developer"
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
                                ? 'Assigning...'
                                : 'Assign Employee'}
                        </button>

                    </div>

                </form>

            </div>

        </div>
    )
}

export default AddEmployeeProject
