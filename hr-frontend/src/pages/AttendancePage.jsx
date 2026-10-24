import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Add from '@mui/icons-material/Add'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import { getErrorMessage } from '../api/client'
import { attendanceApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import FormDialog from '../components/ui/FormDialog'
import PageHeader from '../components/ui/PageHeader'
import SelectField from '../components/ui/SelectField'
import StatusLabel from '../components/ui/StatusLabel'
import { useConfirm, useToast } from '../context/contexts'
import { useAuth } from '../hooks/useAuth'
import { useEntityDialog } from '../hooks/useEntityDialog'
import { useFetch } from '../hooks/useFetch'
import { useEmployeeOptions } from '../hooks/useLookups'
import { ATTENDANCE_STATUSES } from '../utils/constants'
import { addDays, formatMinutes, formatShortDate, formatTime, timePart, toIsoDate } from '../utils/format'

const WORKING_STATUSES = ['PRESENT', 'HALF_DAY']

function CheckInBar() {
    const toast = useToast()
    const today = useFetch(() => attendanceApi.today(), [])
    const [busy, setBusy] = useState(false)
    const data = today.data

    const punch = async (action) => {
        setBusy(true)
        try {
            const result = action === 'in' ? await attendanceApi.checkIn() : await attendanceApi.checkOut()
            today.mutate(result)
            toast.success(action === 'in' ? 'Checked in.' : 'Checked out.')
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    if (!data) {
        return null
    }
    const record = data.record
    let message = 'You have not checked in today.'
    if (data.onApprovedLeave) {
        message = 'You are on approved leave today.'
    } else if (record?.checkOut) {
        message = `Today: in at ${formatTime(record.checkIn)}, out at ${formatTime(record.checkOut)} (${formatMinutes(
            record.workedMinutes
        )}).`
    } else if (record?.checkIn) {
        message = `Checked in at ${formatTime(record.checkIn)}.`
    } else if (record) {
        message = 'Today has been recorded by HR.'
    }

    return (
        <Alert
            severity={record || data.onApprovedLeave ? 'success' : 'info'}
            sx={{ mb: 2.5, alignItems: 'center' }}
            action={
                data.canCheckIn || data.canCheckOut ? (
                    <Button variant="contained" size="small" onClick={() => punch(data.canCheckIn ? 'in' : 'out')} disabled={busy}>
                        {data.canCheckIn ? 'Check in' : 'Check out'}
                    </Button>
                ) : undefined
            }
        >
            {message}
        </Alert>
    )
}

function validateRecord(form) {
    const errors = {}
    const today = toIsoDate(new Date())
    if (!form.employeeId) {
        errors.employeeId = 'Choose an employee.'
    }
    if (!form.attendanceDate) {
        errors.attendanceDate = 'Choose a date.'
    } else if (form.attendanceDate > today) {
        errors.attendanceDate = 'Attendance cannot be recorded for a future date.'
    }
    if (!form.status) {
        errors.status = 'Choose a status.'
    }
    if (form.checkOut && !form.checkIn) {
        errors.checkIn = 'Enter the check-in time first.'
    }
    if (form.checkIn && form.checkOut && form.checkOut < form.checkIn) {
        errors.checkOut = 'Check-out must be after check-in.'
    }
    return errors
}

export default function AttendancePage() {
    const { isManager } = useAuth()
    const toast = useToast()
    const confirm = useConfirm()
    const todayIso = toIsoDate(new Date())

    const [from, setFrom] = useState(addDays(todayIso, -29))
    const [to, setTo] = useState(todayIso)
    const [status, setStatus] = useState('')
    const [employeeId, setEmployeeId] = useState('')
    const [page, setPage] = useState(0)
    const [size, setSize] = useState(20)

    const employees = useEmployeeOptions({ activeOnly: false, enabled: isManager })
    const rangeInvalid = Boolean(from && to && from > to)

    const records = useFetch(
        () =>
            rangeInvalid
                ? Promise.resolve(undefined)
                : attendanceApi.list({ from, to, status, employeeId, page, size }),
        [from, to, status, employeeId, page, size, rangeInvalid]
    )

    const dialog = useEntityDialog({
        toForm: (record) => ({
            employeeId: record?.employeeId || '',
            attendanceDate: record?.attendanceDate || todayIso,
            status: record?.status || 'PRESENT',
            checkIn: timePart(record?.checkIn),
            checkOut: timePart(record?.checkOut),
        }),
        validate: validateRecord,
        save: (form, record) => {
            const works = WORKING_STATUSES.includes(form.status)
            const body = {
                employeeId: Number(form.employeeId),
                attendanceDate: form.attendanceDate,
                status: form.status,
                checkIn: works && form.checkIn ? `${form.attendanceDate}T${form.checkIn}:00` : null,
                checkOut: works && form.checkOut ? `${form.attendanceDate}T${form.checkOut}:00` : null,
            }
            return record ? attendanceApi.update(record.attendanceId, body) : attendanceApi.create(body)
        },
        onSaved: (_result, record) => {
            toast.success(record ? 'Attendance updated.' : 'Attendance recorded.')
            records.reload()
        },
    })

    const remove = async (record) => {
        const ok = await confirm({
            title: 'Delete this attendance record?',
            message: `${record.employeeName}, ${formatShortDate(record.attendanceDate)}.`,
            confirmText: 'Delete',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await attendanceApi.remove(record.attendanceId)
            toast.success('Attendance record deleted.')
            records.reload()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const filterChange = (setter) => (event) => {
        setter(event.target.value)
        setPage(0)
    }

    const columns = [
        {
            key: 'date',
            header: 'Date',
            render: (row) => <span className="numeric">{formatShortDate(row.attendanceDate)}</span>,
        },
        ...(isManager
            ? [
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
              ]
            : []),
        { key: 'status', header: 'Status', render: (row) => <StatusLabel value={row.status} /> },
        { key: 'in', header: 'Check in', render: (row) => <span className="numeric">{row.checkIn ? formatTime(row.checkIn) : '—'}</span> },
        { key: 'out', header: 'Check out', render: (row) => <span className="numeric">{row.checkOut ? formatTime(row.checkOut) : '—'}</span> },
        { key: 'worked', header: 'Worked', render: (row) => <span className="numeric">{formatMinutes(row.workedMinutes)}</span> },
        ...(isManager
            ? [
                  {
                      key: 'actions',
                      header: <span className="visually-hidden">Actions</span>,
                      align: 'right',
                      render: (row) => (
                          <span className="row-actions">
                              <Tooltip title="Edit">
                                  <IconButton size="small" onClick={() => dialog.open(row)} aria-label="Edit record">
                                      <EditOutlined fontSize="small" />
                                  </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                  <IconButton size="small" onClick={() => remove(row)} aria-label="Delete record">
                                      <DeleteOutlineOutlined fontSize="small" />
                                  </IconButton>
                              </Tooltip>
                          </span>
                      ),
                  },
              ]
            : []),
    ]

    const works = WORKING_STATUSES.includes(dialog.form.status)

    return (
        <>
            <PageHeader
                title="Attendance"
                description={
                    isManager
                        ? 'Daily attendance for everyone. Employees check in themselves; you can record or correct days.'
                        : 'Your daily check-ins. Ask HR if a day is recorded wrongly.'
                }
                actions={
                    isManager ? (
                        <Button variant="contained" startIcon={<Add />} onClick={() => dialog.open()}>
                            Record attendance
                        </Button>
                    ) : null
                }
            />

            <CheckInBar />

            <div className="toolbar">
                <TextField
                    className="filter"
                    label="From"
                    type="date"
                    value={from}
                    onChange={filterChange(setFrom)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: to || todayIso } }}
                    error={rangeInvalid}
                />
                <TextField
                    className="filter"
                    label="To"
                    type="date"
                    value={to}
                    onChange={filterChange(setTo)}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from } }}
                    error={rangeInvalid}
                    helperText={rangeInvalid ? '"To" must be after "From".' : undefined}
                />
                <SelectField
                    className="filter"
                    label="Status"
                    value={status}
                    onChange={filterChange(setStatus)}
                    options={ATTENDANCE_STATUSES}
                    emptyLabel="Any status"
                />
                {isManager ? (
                    <SelectField
                        className="grow"
                        label="Employee"
                        value={employeeId}
                        onChange={filterChange(setEmployeeId)}
                        options={employees.options}
                        emptyLabel="Everyone"
                    />
                ) : null}
            </div>

            <DataTable
                label="Attendance"
                columns={columns}
                rows={records.data?.content}
                rowKey={(row) => row.attendanceId}
                loading={records.loading}
                error={records.error}
                onRetry={records.reload}
                empty={{
                    title: 'No attendance in this period',
                    message: 'Try a wider date range or a different filter.',
                }}
                pagination={{
                    page,
                    size,
                    total: records.data?.totalElements || 0,
                    onPageChange: setPage,
                    onSizeChange: (value) => {
                        setSize(value)
                        setPage(0)
                    },
                }}
            />

            <FormDialog
                open={dialog.isOpen}
                title={dialog.editing ? 'Edit attendance' : 'Record attendance'}
                onClose={dialog.close}
                onSubmit={dialog.submit}
                submitting={dialog.saving}
                submitLabel={dialog.editing ? 'Save changes' : 'Record attendance'}
                error={dialog.error}
            >
                <div className="form-grid">
                    <SelectField
                        className="span-2"
                        label="Employee"
                        required
                        options={employees.options}
                        {...dialog.field('employeeId')}
                    />
                    <TextField
                        label="Date"
                        type="date"
                        required
                        slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: todayIso } }}
                        {...dialog.field('attendanceDate')}
                    />
                    <SelectField label="Status" required options={ATTENDANCE_STATUSES} {...dialog.field('status')} />
                    <TextField
                        label="Check in"
                        type="time"
                        disabled={!works}
                        slotProps={{ inputLabel: { shrink: true } }}
                        {...dialog.field('checkIn')}
                        helperText={dialog.errors.checkIn || (works ? 'Optional' : 'Only for present or half day')}
                    />
                    <TextField
                        label="Check out"
                        type="time"
                        disabled={!works}
                        slotProps={{ inputLabel: { shrink: true } }}
                        {...dialog.field('checkOut')}
                        helperText={dialog.errors.checkOut || (works ? 'Optional' : undefined)}
                    />
                </div>
            </FormDialog>
        </>
    )
}
