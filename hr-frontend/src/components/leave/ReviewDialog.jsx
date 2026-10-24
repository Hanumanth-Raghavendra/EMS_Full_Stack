import { useState } from 'react'
import TextField from '@mui/material/TextField'
import { getErrorMessage } from '../../api/client'
import { leaveApi } from '../../api/endpoints'
import { useToast } from '../../context/contexts'
import { labelFor } from '../../utils/constants'
import { formatDateRange, pluralize } from '../../utils/format'
import FormDialog from '../ui/FormDialog'

/** Approve or reject a leave request. A reason is required to reject. */
export default function ReviewDialog({ leave, decision, onClose, onDone }) {
    const toast = useToast()
    const [comment, setComment] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const rejecting = decision === 'reject'

    const submit = async () => {
        if (rejecting && !comment.trim()) {
            setError('Please give a reason so the employee knows why.')
            return
        }
        setSaving(true)
        try {
            const result = rejecting
                ? await leaveApi.reject(leave.leaveId, comment.trim())
                : await leaveApi.approve(leave.leaveId, comment.trim() || null)
            toast.success(rejecting ? 'Leave request rejected.' : 'Leave request approved.')
            onDone?.(result)
        } catch (err) {
            setError(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <FormDialog
            open={Boolean(leave)}
            title={rejecting ? 'Reject leave request' : 'Approve leave request'}
            description={
                leave
                    ? `${leave.employeeName}: ${labelFor(leave.leaveType).toLowerCase()} leave, ${formatDateRange(
                          leave.startDate,
                          leave.endDate
                      )} (${pluralize(leave.days, 'working day')}). Reason: ${leave.reason}`
                    : ''
            }
            onClose={onClose}
            onSubmit={submit}
            submitting={saving}
            submitLabel={rejecting ? 'Reject' : 'Approve'}
            submitColor={rejecting ? 'error' : 'primary'}
            error={error}
        >
            <TextField
                label={rejecting ? 'Reason for rejecting' : 'Note to the employee (optional)'}
                value={comment}
                onChange={(event) => {
                    setComment(event.target.value)
                    setError('')
                }}
                multiline
                minRows={2}
                autoFocus
                slotProps={{ htmlInput: { maxLength: 500 } }}
            />
        </FormDialog>
    )
}
