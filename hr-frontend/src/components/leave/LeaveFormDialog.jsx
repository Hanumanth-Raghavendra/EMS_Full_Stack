import { useState } from 'react'
import TextField from '@mui/material/TextField'
import { getErrorMessage, getFieldErrors } from '../../api/client'
import { leaveApi } from '../../api/endpoints'
import { useToast } from '../../context/contexts'
import { useFetch } from '../../hooks/useFetch'
import { useEmployeeOptions } from '../../hooks/useLookups'
import { LEAVE_TYPES, labelFor } from '../../utils/constants'
import { countWorkingDays, pluralize, toIsoDate } from '../../utils/format'
import FormDialog from '../ui/FormDialog'
import SelectField from '../ui/SelectField'

function initialForm(leave) {
    const today = toIsoDate(new Date())
    return {
        employeeId: leave?.employeeId || '',
        leaveType: leave?.leaveType || 'CASUAL',
        startDate: leave?.startDate || today,
        endDate: leave?.endDate || today,
        reason: leave?.reason || '',
    }
}

/**
 * Apply for leave, edit a pending request, or (for HR/admins with
 * `onBehalf`) record leave for another employee.
 */
export default function LeaveFormDialog({ open, leave, onBehalf = false, onClose, onSaved }) {
    const toast = useToast()
    const editing = Boolean(leave)
    const [form, setForm] = useState(() => initialForm(leave))
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    const employees = useEmployeeOptions({ enabled: onBehalf && !editing })
    const balanceFor = onBehalf ? form.employeeId || null : leave?.employeeId || null
    const balance = useFetch(
        () => (onBehalf && !balanceFor ? Promise.resolve(null) : leaveApi.balance({ employeeId: balanceFor })),
        [balanceFor, onBehalf]
    )

    const days = countWorkingDays(form.startDate, form.endDate)
    const item = balance.data?.balances?.find((entry) => entry.leaveType === form.leaveType)
    let available = item && item.quota !== null ? item.remaining : null
    if (available !== null && editing && leave.leaveType === form.leaveType) {
        available += leave.days // the request being edited already holds these days
    }

    const change = (field) => (event) => {
        const value = event.target.value
        setForm((current) => {
            const next = { ...current, [field]: value }
            if (field === 'startDate' && (!current.endDate || current.endDate < value)) {
                next.endDate = value
            }
            return next
        })
        setErrors((current) => ({ ...current, [field]: undefined }))
    }

    const submit = async () => {
        const nextErrors = {}
        if (onBehalf && !editing && !form.employeeId) {
            nextErrors.employeeId = 'Choose an employee.'
        }
        if (!form.startDate) {
            nextErrors.startDate = 'Choose a start date.'
        }
        if (!form.endDate) {
            nextErrors.endDate = 'Choose an end date.'
        } else if (form.startDate && form.endDate < form.startDate) {
            nextErrors.endDate = 'End date must be on or after the start date.'
        } else if (form.startDate && form.startDate.slice(0, 4) !== form.endDate.slice(0, 4)) {
            nextErrors.endDate = 'Leave cannot span two calendar years. Submit one request per year.'
        } else if (days === 0) {
            nextErrors.endDate = 'These dates contain no working days.'
        }
        if (form.reason.trim().length < 3) {
            nextErrors.reason = 'Please give a short reason (at least 3 characters).'
        }
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) {
            return
        }

        const body = {
            leaveType: form.leaveType,
            startDate: form.startDate,
            endDate: form.endDate,
            reason: form.reason.trim(),
            ...(onBehalf && !editing ? { employeeId: Number(form.employeeId) } : {}),
        }
        setSaving(true)
        setError('')
        try {
            const result = editing ? await leaveApi.update(leave.leaveId, body) : await leaveApi.apply(body)
            toast.success(editing ? 'Leave request updated.' : 'Leave request submitted for approval.')
            onSaved?.(result)
        } catch (err) {
            setErrors(getFieldErrors(err))
            setError(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    let summary = days > 0 ? `${pluralize(days, 'working day')} (weekends are not counted).` : 'Choose your dates.'
    if (available !== null && days > 0) {
        summary += ` ${available} ${labelFor(form.leaveType).toLowerCase()} day${available === 1 ? '' : 's'} available.`
    }
    const overBalance = available !== null && days > available

    return (
        <FormDialog
            open={open}
            title={editing ? 'Edit leave request' : onBehalf ? 'Record leave for an employee' : 'Apply for leave'}
            onClose={onClose}
            onSubmit={submit}
            submitting={saving}
            submitLabel={editing ? 'Save changes' : 'Submit request'}
            error={error}
        >
            <div className="form-grid">
                {onBehalf && !editing ? (
                    <SelectField
                        className="span-2"
                        label="Employee"
                        value={form.employeeId}
                        onChange={change('employeeId')}
                        options={employees.options}
                        error={Boolean(errors.employeeId)}
                        helperText={errors.employeeId}
                        required
                    />
                ) : null}
                <SelectField
                    className="span-2"
                    label="Leave type"
                    value={form.leaveType}
                    onChange={change('leaveType')}
                    options={LEAVE_TYPES}
                    error={Boolean(errors.leaveType)}
                    helperText={errors.leaveType}
                    required
                />
                <TextField
                    label="From"
                    type="date"
                    value={form.startDate}
                    onChange={change('startDate')}
                    error={Boolean(errors.startDate)}
                    helperText={errors.startDate}
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                />
                <TextField
                    label="To"
                    type="date"
                    value={form.endDate}
                    onChange={change('endDate')}
                    error={Boolean(errors.endDate)}
                    helperText={errors.endDate}
                    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.startDate } }}
                    required
                />
                <p className={`span-2 ${overBalance ? '' : 'muted'}`} style={{ margin: 0, color: overBalance ? '#B42318' : undefined }} role="status">
                    {overBalance ? `This is more than the ${available} day(s) available. ` : ''}
                    {summary}
                </p>
                <TextField
                    className="span-2"
                    label="Reason"
                    value={form.reason}
                    onChange={change('reason')}
                    error={Boolean(errors.reason)}
                    helperText={errors.reason || 'Visible to HR when they review the request.'}
                    multiline
                    minRows={2}
                    required
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                />
            </div>
        </FormDialog>
    )
}
