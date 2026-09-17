import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import PrimaryButton from '../components/ui/PrimaryButton'
import PageHeader from '../components/ui/PageHeader'
import StatusBadge from '../components/ui/StatusBadge'
import ActionButton from '../components/ui/ActionButton'
import SearchInput from '../components/ui/SearchInput'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import api from '../api/axios'
import { sortById } from '../utils/sortById'

function Employees() {
    const navigate = useNavigate()
    const role = useSelector((state) => state.auth.role)
    const isEmployee = role === 'EMPLOYEE'

    const [employees, setEmployees] = useState([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [employeeToDelete, setEmployeeToDelete] = useState(null)

    const searchInputRef = useRef(null)


    useEffect(() => {
        const run = async () => {
            try {
                setLoading(true)
                setError('')
                const response = await api.get('/api/employees')
                setEmployees(
                    sortById(response.data, 'employeeId')
                )
            } catch (err) {
                setError(err.response?.data?.message || 'Unable to load employees.')
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [])

    useEffect(() => {
        searchInputRef.current?.focus()
    }, [])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()

        if (!q) {
            return employees
        }

        return employees.filter((employee) =>
            [
                employee.employeeCode,
                employee.firstName,
                employee.lastName,
                employee.email,
                employee.departmentName,
                employee.designationName,
            ].some((value) =>
                String(value ?? '')
                    .toLowerCase()
                    .includes(q)
            )
        )
    }, [employees, query])

    const remove = useCallback(async (employee) => {
        try {
            await api.delete(
                `/api/employees/${employee.employeeId}`
            )

            setEmployees((items) =>
                items.filter(
                    (item) =>
                        item.employeeId !==
                        employee.employeeId
                )
            )
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to delete employee. Related records may exist.'
            )
        }
    }, [])

    return (
        <div className="page-container">
            <PageHeader
                title="Employees"
                description="Manage employee master data."
                action={
                    !isEmployee ? (
                        <PrimaryButton
                            onClick={() =>
                                navigate('/employees/add')
                            }
                        >
                            + Add Employee
                        </PrimaryButton>
                    ) : null
                }
            />

            <div className="toolbar">
                <SearchInput
                    inputRef={searchInputRef}
                    value={query}
                    onChange={(e) =>
                        setQuery(e.target.value)
                    }
                    placeholder="Search employees..."
                />

                <span>
                    {filtered.length} records
                </span>
            </div>

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <div className="table-card">
                {loading ? (
                    <LoadingState
                        message="Loading employees..."
                    />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title="No employees found"
                        message="There are no employees matching your search."
                    />
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Code</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Department</th>
                                    <th>Designation</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filtered.map(
                                    (employee) => (
                                        <tr
                                            key={
                                                employee.employeeId
                                            }
                                        >
                                            <td>
                                                {
                                                    employee.employeeId
                                                }
                                            </td>

                                            <td>
                                                {
                                                    employee.employeeCode
                                                }
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        employee.firstName
                                                    }{' '}
                                                    {
                                                        employee.lastName
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    employee.email
                                                }
                                            </td>

                                            <td>
                                                {
                                                    employee.phone
                                                }
                                            </td>

                                            <td>
                                                {employee.departmentName || '-'}
                                            </td>

                                            <td>{employee.designationName || '-'}</td>

                                            <td>
                                                <StatusBadge
                                                    status={
                                                        employee.status
                                                    }
                                                />
                                            </td>

                                            <td>
                                                <div className="action-buttons">
                                                    <ActionButton
                                                        onClick={() =>
                                                            navigate(
                                                                `/employees/edit/${employee.employeeId}`
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </ActionButton>

                                                    {!isEmployee && (
                                                        <ActionButton
                                                            color="error"
                                                            onClick={() =>
                                                                setEmployeeToDelete(
                                                                    employee
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </ActionButton>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={Boolean(employeeToDelete)}
                title="Delete Employee"
                message={
                    employeeToDelete
                        ? `Are you sure you want to delete ${employeeToDelete.firstName} ${employeeToDelete.lastName}?`
                        : ''
                }
                onCancel={() =>
                    setEmployeeToDelete(null)
                }
                onConfirm={async () => {
                    if (employeeToDelete) {
                        await remove(employeeToDelete)
                        setEmployeeToDelete(null)
                    }
                }}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    )
}

export default Employees