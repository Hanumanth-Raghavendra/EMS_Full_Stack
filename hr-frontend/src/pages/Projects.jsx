import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../api/axios'
import { sortById } from '../utils/sortById'

function Projects() {
    const navigate = useNavigate()
    const role = useSelector((state) => state.auth.role)
    const isEmployee = role === 'EMPLOYEE'

    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [deletingId, setDeletingId] = useState(null)


    useEffect(() => {
        const run = async () => {
            try {
                setLoading(true)
                setError('')
                const response = await api.get('/api/projects')
                setProjects(
                    sortById(response.data, 'projectId')
                )
            } catch (err) {
                console.error(err)
                setError(err.response?.data?.message || 'Unable to load projects.')
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [])

    const handleDelete = async (project) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${project.projectName}"?`
        )

        if (!confirmed) {
            return
        }

        try {
            setDeletingId(project.projectId)
            setError('')

            await api.delete(
                `/api/projects/${project.projectId}`
            )

            setProjects((previous) =>
                previous.filter(
                    (item) =>
                        item.projectId !== project.projectId
                )
            )
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
                'Unable to delete project. It may have related employee assignments.'
            )
        } finally {
            setDeletingId(null)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading projects...</p>
            </div>
        )
    }

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1>Projects</h1>
                    <p>Manage project records.</p>
                </div>

                <div className="header-actions">
                    <button
                        className="secondary-button"
                        onClick={() => navigate('/dashboard')}
                    >
                        Dashboard
                    </button>

                    {!isEmployee && <button
                        className="primary-button"
                        onClick={() => navigate('/projects/add')}
                    >
                        + Add Project
                    </button>}
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <div className="table-card">

                {projects.length === 0 ? (
                    <div className="empty-state">
                        <h2>No projects found</h2>

                        <p>
                            Add your first project to get started.
                        </p>

                        {!isEmployee && <button
                            className="primary-button"
                            onClick={() =>
                                navigate('/projects/add')
                            }
                        >
                            + Add Project
                        </button>}
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Project Name</th>
                                    <th>Description</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {projects.map((project) => (
                                    <tr key={project.projectId}>

                                        <td>
                                            {project.projectId}
                                        </td>

                                        <td>
                                            <strong>
                                                {project.projectName}
                                            </strong>
                                        </td>

                                        <td>
                                            {project.description || '-'}
                                        </td>

                                        <td>
                                            {project.startDate || '-'}
                                        </td>

                                        <td>
                                            {project.endDate || '-'}
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    project.status === 'ACTIVE'
                                                        ? 'status-active'
                                                        : project.status === 'PLANNED'
                                                            ? 'status-planned'
                                                            : project.status === 'INACTIVE'
                                                                ? 'status-inactive'
                                                                : 'status-completed'
                                                }
                                            >
                                                {project.status}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="action-buttons">

                                                <button
                                                    className="edit-button"
                                                    onClick={() =>
                                                        navigate(
                                                            `/projects/edit/${project.projectId}`
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="delete-button"
                                                    onClick={() =>
                                                        handleDelete(project)
                                                    }
                                                    disabled={
                                                        deletingId ===
                                                        project.projectId
                                                    }
                                                >
                                                    {deletingId ===
                                                        project.projectId
                                                        ? 'Deleting...'
                                                        : 'Delete'}
                                                </button>

                                            </div>
                                        </td>

                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            </div>
        </div>
    )
}

export default Projects