import { useState } from 'react'
import TextField from '@mui/material/TextField'
import { auditApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import PageHeader from '../components/ui/PageHeader'
import SelectField from '../components/ui/SelectField'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useFetch } from '../hooks/useFetch'
import { formatDateTime } from '../utils/format'

const ACTION_LABELS = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    LOGIN: 'Signed in',
    LOGIN_FAILED: 'Failed sign-in',
    PASSWORD_CHANGE: 'Changed password',
    PASSWORD_RESET: 'Reset password',
    APPROVE: 'Approved',
    REJECT: 'Rejected',
    CANCEL: 'Cancelled',
    CHECK_IN: 'Checked in',
    CHECK_OUT: 'Checked out',
    SETUP: 'Initial setup',
}

const ENTITY_LABELS = {
    Employee: 'Employee',
    User: 'User account',
    Department: 'Department',
    Designation: 'Designation',
    Attendance: 'Attendance',
    LeaveRequest: 'Leave request',
    Project: 'Project',
    EmployeeProject: 'Project team',
}

function Change({ oldValue, newValue }) {
    if (!oldValue && !newValue) {
        return <span className="muted">—</span>
    }
    return (
        <div className="audit-change">
            {oldValue ? <del>{oldValue}</del> : null}
            {oldValue && newValue ? <br /> : null}
            {newValue ? <ins>{newValue}</ins> : null}
        </div>
    )
}

export default function AuditLogsPage() {
    const [action, setAction] = useState('')
    const [entityName, setEntityName] = useState('')
    const [username, setUsername] = useState('')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(20)
    const debouncedUser = useDebouncedValue(username.trim())
    const filters = useFetch(() => auditApi.filters(), [])
    const logs = useFetch(
        () => auditApi.list({ action, entityName, username: debouncedUser, from, to, page, size }),
        [action, entityName, debouncedUser, from, to, page, size]
    )

    const change = (setter) => (event) => {
        setter(event.target.value)
        setPage(0)
    }

    const columns = [
        { key: 'when', header: 'When', render: (row) => <span className="numeric">{formatDateTime(row.createdAt)}</span> },
        { key: 'who', header: 'Who', render: (row) => <span className="cell-primary">{row.username || 'system'}</span> },
        { key: 'action', header: 'Action', render: (row) => ACTION_LABELS[row.action] || row.action },
        {
            key: 'record',
            header: 'Record',
            render: (row) => (
                <>
                    {ENTITY_LABELS[row.entityName] || row.entityName || '—'}
                    {row.entityId ? <span className="cell-secondary">#{row.entityId}</span> : null}
                </>
            ),
        },
        { key: 'change', header: 'Details', render: (row) => <Change oldValue={row.oldValue} newValue={row.newValue} /> },
    ]

    return (
        <>
            <PageHeader
                title="Audit log"
                description="Every change, sign-in and approval, newest first. Entries cannot be edited or deleted."
            />
            <div className="toolbar">
                <SelectField
                    className="filter"
                    label="Action"
                    value={action}
                    onChange={change(setAction)}
                    options={(filters.data?.actions || []).map((value) => ({ value, label: ACTION_LABELS[value] || value }))}
                    emptyLabel="Any action"
                />
                <SelectField
                    className="filter"
                    label="Record type"
                    value={entityName}
                    onChange={change(setEntityName)}
                    options={(filters.data?.entityNames || []).map((value) => ({ value, label: ENTITY_LABELS[value] || value }))}
                    emptyLabel="Any record"
                />
                <TextField className="filter" label="User" type="search" value={username} onChange={change(setUsername)} />
                <TextField className="filter" label="From" type="date" value={from} onChange={change(setFrom)} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField className="filter" label="To" type="date" value={to} onChange={change(setTo)} slotProps={{ inputLabel: { shrink: true } }} />
            </div>
            <DataTable
                label="Audit log"
                columns={columns}
                rows={logs.data?.content}
                rowKey={(row) => row.auditId}
                loading={logs.loading}
                error={logs.error}
                onRetry={logs.reload}
                empty={{ title: 'No entries match', message: 'Try removing a filter.' }}
                pagination={{
                    page,
                    size,
                    total: logs.data?.totalElements || 0,
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
