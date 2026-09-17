import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../api/axios'

function EmployeeProjects() {
    const [assignments, setAssignments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [deleting, setDeleting] = useState(null)

    const navigate = useNavigate()
    const role = useSelector((state) => state.auth.role)
    const isEmployee = role === 'EMPLOYEE'

    useEffect(() => {
        const run = async () => {
            try {
                setLoading(true)
                setError('')

                const response =
                    await api.get('/api/employee-projects')

                const sortedAssignments = [
                    ...response.data,
                ].sort((a, b) => {
                    const employeeIdA =
                        Number(a.employeeId ?? Number.MAX_SAFE_INTEGER)

                    const employeeIdB =
                        Number(b.employeeId ?? Number.MAX_SAFE_INTEGER)

                    if (employeeIdA !== employeeIdB) {
                        return employeeIdA - employeeIdB
                    }

                    const projectIdA =
                        Number(a.projectId ?? Number.MAX_SAFE_INTEGER)

                    const projectIdB =
                        Number(b.projectId ?? Number.MAX_SAFE_INTEGER)

                    return projectIdA - projectIdB
                })

                setAssignments(sortedAssignments)
            } catch (err) {
                console.error(err)

                setError(
                    err.response?.data?.message ||
                    'Unable to load employee project assignments.'
                )
            } finally {
                setLoading(false)
            }
        }

        run()
    }, [])

    const handleDelete = async (assignment) => {
        const confirmed = window.confirm(
            `Remove ${assignment.employeeName} from ${assignment.projectName}?`
        )

        if (!confirmed) {
            return
        }

        try {
            setDeleting(
                `${assignment.employeeId}-${assignment.projectId}`
            )

            setError('')

            await api.delete(
                `/api/employee-projects/${assignment.employeeId}/${assignment.projectId}`
            )

            setAssignments((previous) =>
                previous.filter(
                    (item) =>
                        !(
                            item.employeeId === assignment.employeeId &&
                            item.projectId === assignment.projectId
                        )
                )
            )
        } catch (err) {
            console.error(err)

            setError(
                err.response?.data?.message ||
                'Unable to remove employee from project.'
            )
        } finally {
            setDeleting(null)
        }
    }

    if (loading) {
        return (
            <div className="page-container">
                <p>Loading assignments...</p>
            </div>
        )
    }

    return (
        <div className="page-container">

            <div className="page-header">
                <div>
                    <h1>Employee Projects</h1>
                    <p>
                        Manage employees assigned to projects.
                    </p>
                </div>

                <div className="header-actions">

                    <button
                        className="secondary-button"
                        onClick={() => navigate('/dashboard')}
                    >
                        Dashboard
                    </button>

                    {!isEmployee && (
                        <button
                            className="primary-button"
                            onClick={() =>
                                navigate('/employee-projects/add')
                            }
                        >
                            + Assign Employee
                        </button>
                    )}

                </div>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <div className="table-card">

                {assignments.length === 0 ? (
                    <div className="empty-state">
                        <h2>No project assignments found</h2>

                        <p>
                            Assign an employee to a project to get started.
                        </p>

                        {!isEmployee && (
                            <button
                                className="primary-button"
                                onClick={() =>
                                    navigate('/employee-projects/add')
                                }
                            >
                                + Assign Employee
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="table-wrapper">

                        <table>

                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Project</th>
                                    <th>Assigned At</th>
                                    <th>Role</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                                {assignments.map((assignment) => {

                                    const assignmentId =
                                        `${assignment.employeeId}-${assignment.projectId}`

                                    return (
                                        <tr key={assignmentId}>

                                            <td>
                                                <strong>
                                                    {assignment.employeeName}
                                                </strong>
                                            </td>

                                            <td>
                                                {assignment.projectName}
                                            </td>

                                            <td>
                                                {assignment.assignedAt
                                                    ? new Date(
                                                        assignment.assignedAt
                                                    ).toLocaleString()
                                                    : '-'}
                                            </td>

                                            <td>
                                                {assignment.roleInProject || '-'}
                                            </td>

                                            <td>
                                                {isEmployee ? (
                                                    'View only'
                                                ) : (
                                                    <div className="action-buttons">

                                                        <button
                                                            className="edit-button"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/employee-projects/edit/${assignment.employeeId}/${assignment.projectId}`
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            className="delete-button"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    assignment
                                                                )
                                                            }
                                                            disabled={
                                                                deleting ===
                                                                assignmentId
                                                            }
                                                        >
                                                            {deleting ===
                                                                assignmentId
                                                                ? 'Removing...'
                                                                : 'Delete'}
                                                        </button>

                                                    </div>
                                                )}
                                            </td>

                                        </tr>
                                    )
                                })}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>

        </div>
    )
}

export default EmployeeProjects