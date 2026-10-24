import { useState } from 'react'
import { useDispatch } from 'react-redux'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { getErrorMessage, getFieldErrors } from '../api/client'
import { authApi, employeesApi } from '../api/endpoints'
import ErrorState from '../components/ui/ErrorState'
import Loading from '../components/ui/Loading'
import PageHeader from '../components/ui/PageHeader'
import PasswordField from '../components/ui/PasswordField'
import RoleTag from '../components/ui/RoleTag'
import StatusLabel from '../components/ui/StatusLabel'
import { useToast } from '../context/contexts'
import { useAuth } from '../hooks/useAuth'
import { useFetch } from '../hooks/useFetch'
import { sessionStarted, userUpdated } from '../store/authSlice'
import { formatDate, formatDateTime } from '../utils/format'
import { MESSAGES, PATTERNS, hasErrors, matches, required, validate, validatePasswordPair } from '../utils/validation'

function Detail({ label, children }) {
    return (
        <div>
            <div className="muted" style={{ fontSize: 13 }}>
                {label}
            </div>
            <div className="cell-primary">{children || '—'}</div>
        </div>
    )
}

function ContactForm({ employee, onSaved }) {
    const toast = useToast()
    const [form, setForm] = useState({ email: employee.email || '', phone: employee.phone || '' })
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const changed = form.email !== employee.email || form.phone !== (employee.phone || '')

    const submit = async (event) => {
        event.preventDefault()
        const nextErrors = validate(form, {
            email: [required('Email is required.'), matches(PATTERNS.email, MESSAGES.email)],
            phone: [required('Phone is required.'), matches(PATTERNS.phone, MESSAGES.phone)],
        })
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
            return
        }
        setSaving(true)
        try {
            const updated = await employeesApi.updateMyContact({ email: form.email.trim(), phone: form.phone.trim() })
            toast.success('Contact details saved.')
            onSaved(updated)
        } catch (error) {
            setErrors(getFieldErrors(error))
            toast.error(getErrorMessage(error))
        } finally {
            setSaving(false)
        }
    }

    return (
        <form className="sheet sheet-body" onSubmit={submit} noValidate>
            <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
                Contact details
            </Typography>
            <p className="muted" style={{ marginTop: 0 }}>
                You can update these yourself. For other changes, contact HR.
            </p>
            <div className="form-grid">
                <TextField
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    error={Boolean(errors.email)}
                    helperText={errors.email}
                />
                <TextField
                    label="Mobile number"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    error={Boolean(errors.phone)}
                    helperText={errors.phone}
                    slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
                />
            </div>
            <div className="form-actions">
                <Button type="submit" variant="contained" disabled={saving || !changed}>
                    {saving ? 'Saving…' : 'Save contact details'}
                </Button>
            </div>
        </form>
    )
}

function PasswordForm() {
    const dispatch = useDispatch()
    const toast = useToast()
    const [form, setForm] = useState({ currentPassword: '', password: '', confirmPassword: '' })
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)

    const submit = async (event) => {
        event.preventDefault()
        const nextErrors = {
            ...(form.currentPassword ? {} : { currentPassword: 'Enter your current password.' }),
            ...validatePasswordPair(form.password, form.confirmPassword),
        }
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
            return
        }
        setSaving(true)
        try {
            const session = await authApi.changePassword({
                currentPassword: form.currentPassword,
                newPassword: form.password,
            })
            dispatch(sessionStarted(session))
            setForm({ currentPassword: '', password: '', confirmPassword: '' })
            toast.success('Password changed. Other devices have been signed out.')
        } catch (error) {
            const fields = getFieldErrors(error)
            setErrors({
                currentPassword: fields.currentPassword,
                password: fields.newPassword,
            })
            if (!fields.currentPassword && !fields.newPassword) {
                toast.error(getErrorMessage(error))
            }
        } finally {
            setSaving(false)
        }
    }

    const change = (field) => (event) => setForm({ ...form, [field]: event.target.value })

    return (
        <form className="sheet sheet-body" onSubmit={submit} noValidate>
            <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
                Change password
            </Typography>
            <p className="muted" style={{ marginTop: 0 }}>
                Changing your password signs you out everywhere else.
            </p>
            <div className="form-grid">
                <PasswordField
                    className="span-2"
                    label="Current password"
                    value={form.currentPassword}
                    onChange={change('currentPassword')}
                    error={Boolean(errors.currentPassword)}
                    helperText={errors.currentPassword}
                    autoComplete="current-password"
                />
                <PasswordField
                    label="New password"
                    value={form.password}
                    onChange={change('password')}
                    error={Boolean(errors.password)}
                    helperText={errors.password || MESSAGES.password}
                    autoComplete="new-password"
                />
                <PasswordField
                    label="Confirm new password"
                    value={form.confirmPassword}
                    onChange={change('confirmPassword')}
                    error={Boolean(errors.confirmPassword)}
                    helperText={errors.confirmPassword}
                    autoComplete="new-password"
                />
            </div>
            <div className="form-actions">
                <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Changing…' : 'Change password'}
                </Button>
            </div>
        </form>
    )
}

export default function ProfilePage() {
    const dispatch = useDispatch()
    const { user } = useAuth()
    const profile = useFetch(() => employeesApi.me(), [])

    if (profile.error && !profile.data) {
        return <ErrorState error={profile.error} onRetry={profile.reload} />
    }
    if (!profile.data) {
        return <Loading />
    }
    const employee = profile.data

    return (
        <>
            <PageHeader title={employee.fullName} description="Your employee record and sign-in details." />

            <div className="sheet sheet-body">
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '18px 24px',
                    }}
                >
                    <Detail label="Employee code">{employee.employeeCode}</Detail>
                    <Detail label="Department">{employee.departmentName}</Detail>
                    <Detail label="Designation">{employee.designationName}</Detail>
                    <Detail label="Joined">{formatDate(employee.dateOfJoining)}</Detail>
                    <Detail label="Status">
                        <StatusLabel value={employee.status} />
                    </Detail>
                    <Detail label="Username">{user?.username}</Detail>
                    <Detail label="Role">
                        <RoleTag role={user?.role} />
                    </Detail>
                    <Detail label="Last sign-in">{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : null}</Detail>
                </div>
            </div>

            <div className="columns" style={{ marginTop: 20 }}>
                <ContactForm
                    key={`${employee.email}|${employee.phone}`}
                    employee={employee}
                    onSaved={(updated) => {
                        profile.mutate(updated)
                        dispatch(userUpdated({ email: updated.email, phone: updated.phone }))
                    }}
                />
                <PasswordForm />
            </div>
        </>
    )
}
