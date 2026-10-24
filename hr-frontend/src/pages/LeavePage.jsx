import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Add from '@mui/icons-material/Add'
import { getErrorMessage } from '../api/client'
import { leaveApi } from '../api/endpoints'
import LeaveBalance from '../components/leave/LeaveBalance'
import LeaveFormDialog from '../components/leave/LeaveFormDialog'
import ReviewDialog from '../components/leave/ReviewDialog'
import DataTable from '../components/ui/DataTable'
import PageHeader from '../components/ui/PageHeader'
import SelectField from '../components/ui/SelectField'
import StatusLabel from '../components/ui/StatusLabel'
import { useConfirm, useToast } from '../context/contexts'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { useEmployeeOptions } from '../hooks/useLookups'
import { LEAVE_STATUSES, LEAVE_TYPES, labelFor } from '../utils/constants'
import { formatDateRange, formatDateTime, pluralize } from '../utils/format'

function DatesCell({ row }) {
    return (
        <>
            <span className="numeric">{formatDateRange(row.startDate, row.endDate)}</span>
            <span className="cell-secondary">{pluralize(row.days, 'working day')}</span>
        </>
    )
}

function StatusCell({ row }) {
    return (
        <>
            <StatusLabel value={row.status} />
            {row.reviewedByUsername || row.reviewComment ? (
                <span className="cell-secondary" style={{ maxWidth: 240, whiteSpace: 'normal' }}>
                    {row.reviewedByUsername ? `by ${row.reviewedByUsername}` : ''}
                    {row.reviewComment ? `: “${row.reviewComment}”` : ''}
                </span>
            ) : null}
        </>
    )
}

function useLeaveActions({ onChanged }) {
    const toast = useToast()
    const confirm = useConfirm()

    const cancel = async (row) => {
        const ok = await confirm({
            title: 'Cancel this leave request?',
            message:
                row.status === 'APPROVED'
                    ? 'The leave days will be returned to the balance and removed from attendance.'
                    : 'The request will be withdrawn.',
            confirmText: 'Cancel request',
            cancelText: 'Keep it',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await leaveApi.cancel(row.leaveId)
            toast.success('Leave request cancelled.')
            onChanged()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const remove = async (row) => {
        const ok = await confirm({
            title: 'Delete this leave request?',
            message: 'This removes the request from the history entirely. Cancelling keeps a record.',
            confirmText: 'Delete',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await leaveApi.remove(row.leaveId)
            toast.success('Leave request deleted.')
            onChanged()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    return { cancel, remove }
}

function ActionsCell({ row, onEdit, onReview, onCancel, onDelete }) {
    const p = row.permissions || {}
    const nothing = !(p.review && onReview) && !(p.edit && onEdit) && !(p.cancel && onCancel) && !(p.delete && onDelete)
    if (nothing) {
        return null
    }
    return (
        <span className="row-actions">
            {p.review && onReview ? (
                <>
                    <Button size="small" onClick={() => onReview(row, 'approve')}>
                        Approve
                    </Button>
                    <Button size="small" color="error" onClick={() => onReview(row, 'reject')}>
                        Reject
                    </Button>
                </>
            ) : null}
            {p.edit && onEdit ? (
                <Button size="small" color="inherit" onClick={() => onEdit(row)}>
                    Edit
                </Button>
            ) : null}
            {p.cancel && onCancel ? (
                <Button size="small" color="inherit" onClick={() => onCancel(row)}>
                    Cancel
                </Button>
            ) : null}
            {p.delete && onDelete ? (
                <Button size="small" color="error" onClick={() => onDelete(row)}>
                    Delete
                </Button>
            ) : null}
        </span>
    )
}

function MyLeave({ refreshKey, onApply, onEdit }) {
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(10)
    const [version, setVersion] = useState(0)
    const balance = useFetch(() => leaveApi.balance(), [version, refreshKey])
    const requests = useFetch(() => leaveApi.list({ mine: true, page, size }), [page, size, version, refreshKey])
    const refresh = () => setVersion((value) => value + 1)
    const actions = useLeaveActions({ onChanged: refresh })

    const columns = [
        { key: 'type', header: 'Type', render: (row) => <span className="cell-primary">{labelFor(row.leaveType)}</span> },
        { key: 'dates', header: 'Dates', render: (row) => <DatesCell row={row} /> },
        { key: 'reason', header: 'Reason', render: (row) => <span style={{ whiteSpace: 'normal' }}>{row.reason}</span> },
        { key: 'status', header: 'Status', render: (row) => <StatusCell row={row} /> },
        {
            key: 'actions',
            header: <span className="visually-hidden">Actions</span>,
            align: 'right',
            render: (row) => <ActionsCell row={row} onEdit={onEdit} onCancel={actions.cancel} />,
        },
    ]

    return (
        <>
            {balance.data ? <LeaveBalance balances={balance.data.balances} /> : null}
            <div className="section-title" style={{ marginTop: 24 }}>
                <h2 className="visually-hidden">My requests</h2>
            </div>
            <DataTable
                label="My leave requests"
                columns={columns}
                rows={requests.data?.content}
                rowKey={(row) => row.leaveId}
                loading={requests.loading}
                error={requests.error}
                onRetry={requests.reload}
                empty={{
                    title: 'You have not applied for leave yet',
                    message: 'Requests you submit appear here with their approval status.',
                    action: (
                        <Button variant="contained" onClick={onApply}>
                            Apply for leave
                        </Button>
                    ),
                }}
                pagination={{
                    page,
                    size,
                    total: requests.data?.totalElements || 0,
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

function TeamLeave({ approvalsOnly, refreshKey, onEdit, onRecord }) {
    const [status, setStatus] = useState(approvalsOnly ? 'PENDING' : '')
    const [leaveType, setLeaveType] = useState('')
    const [employeeId, setEmployeeId] = useState('')
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(20)
    const [review, setReview] = useState(null)
    const employees = useEmployeeOptions({ activeOnly: false, enabled: !approvalsOnly })

    const requests = useFetch(
        () =>
            leaveApi.list({
                status: approvalsOnly ? 'PENDING' : status,
                leaveType,
                employeeId,
                page,
                size,
                sort: approvalsOnly ? 'appliedAt,asc' : undefined,
            }),
        [approvalsOnly, status, leaveType, employeeId, page, size, refreshKey]
    )
    const actions = useLeaveActions({ onChanged: requests.reload })

    const columns = [
        {
            key: 'employee',
            header: 'Employee',
            render: (row) => (
                <>
                    <span className="cell-primary">{row.employeeName}</span>
                    <span className="cell-secondary">{row.employeeCode}</span>
                </>
            ),
        },
        { key: 'type', header: 'Type', render: (row) => labelFor(row.leaveType) },
        { key: 'dates', header: 'Dates', render: (row) => <DatesCell row={row} /> },
        {
            key: 'reason',
            header: 'Reason',
            render: (row) => <span style={{ whiteSpace: 'normal', display: 'block', maxWidth: 260 }}>{row.reason}</span>,
        },
        approvalsOnly
            ? {
                  key: 'applied',
                  header: 'Applied',
                  render: (row) => <span className="numeric">{formatDateTime(row.appliedAt)}</span>,
              }
            : { key: 'status', header: 'Status', render: (row) => <StatusCell row={row} /> },
        {
            key: 'actions',
            header: <span className="visually-hidden">Actions</span>,
            align: 'right',
            render: (row) =>
                approvalsOnly && !row.permissions?.review ? (
                    <Tooltip title="Your own requests, and requests from HR staff, are reviewed by an administrator.">
                        <span className="muted" style={{ fontSize: 13 }}>
                            Not yours to review
                        </span>
                    </Tooltip>
                ) : (
                    <ActionsCell
                        row={row}
                        onReview={(r, decision) => setReview({ leave: r, decision })}
                        onEdit={approvalsOnly ? undefined : onEdit}
                        onCancel={approvalsOnly ? undefined : actions.cancel}
                        onDelete={approvalsOnly ? undefined : actions.remove}
                    />
                ),
        },
    ]

    const filter = (setter) => (event) => {
        setter(event.target.value)
        setPage(0)
    }

    return (
        <>
            {!approvalsOnly ? (
                <div className="toolbar">
                    <SelectField className="filter" label="Status" value={status} onChange={filter(setStatus)} options={LEAVE_STATUSES} emptyLabel="Any status" />
                    <SelectField className="filter" label="Type" value={leaveType} onChange={filter(setLeaveType)} options={LEAVE_TYPES} emptyLabel="Any type" />
                    <SelectField className="grow" label="Employee" value={employeeId} onChange={filter(setEmployeeId)} options={employees.options} emptyLabel="Everyone" />
                    <span style={{ flex: 1 }} />
                    <Button variant="outlined" startIcon={<Add />} onClick={onRecord}>
                        Record leave for someone
                    </Button>
                </div>
            ) : null}
            <DataTable
                label={approvalsOnly ? 'Leave requests waiting for approval' : 'All leave requests'}
                columns={columns}
                rows={requests.data?.content}
                rowKey={(row) => row.leaveId}
                loading={requests.loading}
                error={requests.error}
                onRetry={requests.reload}
                empty={
                    approvalsOnly
                        ? { title: 'Nothing waiting for approval', message: 'New requests will appear here, oldest first.' }
                        : { title: 'No leave requests match', message: 'Try clearing the filters.' }
                }
                pagination={{
                    page,
                    size,
                    total: requests.data?.totalElements || 0,
                    onPageChange: setPage,
                    onSizeChange: (value) => {
                        setSize(value)
                        setPage(0)
                    },
                }}
            />
            {review ? (
                <ReviewDialog
                    leave={review.leave}
                    decision={review.decision}
                    onClose={() => setReview(null)}
                    onDone={() => {
                        setReview(null)
                        requests.reload()
                    }}
                />
            ) : null}
        </>
    )
}

export default function LeavePage() {
    const { isManager } = useAuth()
    const [params, setParams] = useSearchParams()
    const requestedTab = params.get('tab')
    const tab = isManager && ['approvals', 'all'].includes(requestedTab) ? requestedTab : 'mine'
    // dialog: { mode: 'apply' | 'edit' | 'record', leave? }
    const [dialog, setDialog] = useState(() => (params.get('apply') ? { mode: 'apply' } : null))
    const [refreshKey, setRefreshKey] = useState(0)

    const setTab = (_event, value) => {
        const next = new URLSearchParams(params)
        next.delete('apply')
        if (value === 'mine') {
            next.delete('tab')
        } else {
            next.set('tab', value)
        }
        setParams(next, { replace: true })
    }

    const closeDialog = () => setDialog(null)
    const afterSave = () => {
        setDialog(null)
        setRefreshKey((value) => value + 1)
    }

    return (
        <>
            <PageHeader
                title="Leave"
                description={
                    isManager
                        ? 'Your own leave, requests waiting for your approval, and the full history.'
                        : 'Apply for leave and follow your requests. Weekends are never counted.'
                }
                actions={
                    <Button variant="contained" startIcon={<Add />} onClick={() => setDialog({ mode: 'apply' })}>
                        Apply for leave
                    </Button>
                }
            />

            {isManager ? (
                <Tabs value={tab} onChange={setTab} sx={{ mb: 2.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab value="mine" label="My leave" />
                    <Tab value="approvals" label="Waiting for approval" />
                    <Tab value="all" label="All requests" />
                </Tabs>
            ) : null}

            {tab === 'mine' ? (
                <MyLeave
                    refreshKey={refreshKey}
                    onApply={() => setDialog({ mode: 'apply' })}
                    onEdit={(leave) => setDialog({ mode: 'edit', leave })}
                />
            ) : (
                <TeamLeave
                    key={tab}
                    approvalsOnly={tab === 'approvals'}
                    refreshKey={refreshKey}
                    onEdit={(leave) => setDialog({ mode: 'edit', leave })}
                    onRecord={() => setDialog({ mode: 'record' })}
                />
            )}

            {dialog ? (
                <LeaveFormDialog
                    open
                    leave={dialog.mode === 'edit' ? dialog.leave : null}
                    onBehalf={dialog.mode === 'record'}
                    onClose={closeDialog}
                    onSaved={afterSave}
                />
            ) : null}
        </>
    )
}
