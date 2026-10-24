import { useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Add from '@mui/icons-material/Add'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import { getErrorMessage } from '../api/client'
import { employeesApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import PageHeader from '../components/ui/PageHeader'
import RoleTag from '../components/ui/RoleTag'
import SelectField from '../components/ui/SelectField'
import StatusLabel from '../components/ui/StatusLabel'
import { useConfirm, useToast } from '../context/contexts'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useFetch } from '../hooks/useFetch'
import { useDepartmentOptions } from '../hooks/useLookups'
import { EMPLOYEE_STATUSES } from '../utils/constants'
import { formatDate } from '../utils/format'

export default function EmployeesPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const confirm = useConfirm()
    const [params] = useSearchParams()
    const [search, setSearch] = useState('')
    const [departmentId, setDepartmentId] = useState(params.get('departmentId') || '')
    const [status, setStatus] = useState('')
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(20)
    const debouncedSearch = useDebouncedValue(search.trim())
    const departments = useDepartmentOptions()

    const employees = useFetch(
        () => employeesApi.list({ search: debouncedSearch, departmentId, status, page, size, sort: 'employeeCode,asc' }),
        [debouncedSearch, departmentId, status, page, size]
    )

    const remove = async (employee) => {
        const ok = await confirm({
            title: `Delete ${employee.fullName}?`,
            message:
                'This permanently removes the employee together with their attendance, leave history, project ' +
                'assignments and login account. To keep the history, edit the employee and set them to Inactive instead.',
            confirmText: 'Delete permanently',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await employeesApi.remove(employee.employeeId)
            toast.success(`${employee.fullName} was deleted.`)
            employees.reload()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const columns = [
        {
            key: 'name',
            header: 'Employee',
            render: (row) => (
                <>
                    <span className="cell-primary">{row.fullName}</span>
                    <span className="cell-secondary">
                        {row.employeeCode}, {row.email}
                    </span>
                </>
            ),
        },
        {
            key: 'role',
            header: 'Department',
            render: (row) => (
                <>
                    <span>{row.departmentName || '—'}</span>
                    <span className="cell-secondary">{row.designationName}</span>
                </>
            ),
        },
        { key: 'joined', header: 'Joined', render: (row) => <span className="numeric">{formatDate(row.dateOfJoining)}</span> },
        {
            key: 'account',
            header: 'Sign-in',
            render: (row) =>
                row.username ? (
                    <>
                        <span>{row.username}</span> <RoleTag role={row.accountRole} />
                    </>
                ) : (
                    <span className="muted">No account</span>
                ),
        },
        { key: 'status', header: 'Status', render: (row) => <StatusLabel value={row.status} /> },
        {
            key: 'actions',
            header: <span className="visually-hidden">Actions</span>,
            align: 'right',
            render: (row) =>
                row.canManage ? (
                    <span className="row-actions">
                        <Tooltip title="Edit">
                            <IconButton
                                size="small"
                                onClick={() => navigate(`/employees/${row.employeeId}/edit`)}
                                aria-label={`Edit ${row.fullName}`}
                            >
                                <EditOutlined fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => remove(row)} aria-label={`Delete ${row.fullName}`}>
                                <DeleteOutlineOutlined fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </span>
                ) : (
                    <Tooltip title="Only administrators can change HR and admin records">
                        <span className="muted" style={{ fontSize: 13 }}>
                            Restricted
                        </span>
                    </Tooltip>
                ),
        },
    ]

    const resetPage = (setter) => (event) => {
        setter(event.target.value)
        setPage(0)
    }

    return (
        <>
            <PageHeader
                title="Employees"
                description="Everyone on the payroll, their department and whether they can sign in."
                actions={
                    <Button component={RouterLink} to="/employees/new" variant="contained" startIcon={<Add />}>
                        Add employee
                    </Button>
                }
            />

            <div className="toolbar">
                <TextField
                    className="grow"
                    label="Search"
                    placeholder="Name, code or email"
                    value={search}
                    onChange={resetPage(setSearch)}
                    type="search"
                />
                <SelectField
                    className="filter"
                    label="Department"
                    value={departmentId}
                    onChange={resetPage(setDepartmentId)}
                    options={departments.options}
                    emptyLabel="All departments"
                />
                <SelectField
                    className="filter"
                    label="Status"
                    value={status}
                    onChange={resetPage(setStatus)}
                    options={EMPLOYEE_STATUSES}
                    emptyLabel="Any status"
                />
            </div>

            <DataTable
                label="Employees"
                columns={columns}
                rows={employees.data?.content}
                rowKey={(row) => row.employeeId}
                loading={employees.loading}
                error={employees.error}
                onRetry={employees.reload}
                empty={
                    search || departmentId || status
                        ? { title: 'No employees match these filters', message: 'Try a different search or clear the filters.' }
                        : {
                              title: 'No employees yet',
                              message: 'Add your first employee to start tracking attendance and leave.',
                              action: (
                                  <Button component={RouterLink} to="/employees/new" variant="contained">
                                      Add employee
                                  </Button>
                              ),
                          }
                }
                pagination={{
                    page,
                    size,
                    total: employees.data?.totalElements || 0,
                    onPageChange: setPage,
                    onSizeChange: (value) => {
                        setSize(value)
                        setPage(0)
                    },
                }}
            />
        </>
    )
}
