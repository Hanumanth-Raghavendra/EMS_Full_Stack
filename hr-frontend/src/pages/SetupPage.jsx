import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { getErrorMessage, getFieldErrors } from '../api/client'
import { setupApi } from '../api/endpoints'
import BrandMark from '../components/ui/BrandMark'
import DecorativeRegister from '../components/ui/DecorativeRegister'
import Loading from '../components/ui/Loading'
import PasswordField from '../components/ui/PasswordField'
import { useToast } from '../context/contexts'
import {
    MESSAGES,
    PATTERNS,
    hasErrors,
    matches,
    required,
    validate,
    validatePasswordPair,
} from '../utils/validation'

const EMPTY = {
    existingEmployeeCode: '',
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: 'admin',
    password: '',
    confirmPassword: '',
    setupToken: '',
}

export default function SetupPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const [status, setStatus] = useState(null)
    const [loadError, setLoadError] = useState(null)
    const [mode, setMode] = useState('new')
    const [form, setForm] = useState(EMPTY)
    const [errors, setErrors] = useState({})
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setupApi.status().then(setStatus, setLoadError)
    }, [])

    const change = (field) => (event) => {
        setForm((current) => ({ ...current, [field]: event.target.value }))
        setErrors((current) => ({ ...current, [field]: undefined }))
    }

    const submit = async (event) => {
        event.preventDefault()
        setFormError('')

        const rules =
            mode === 'new'
                ? {
                      employeeCode: [required('Employee code is required.'), matches(PATTERNS.employeeCode, MESSAGES.employeeCode)],
                      firstName: [required('First name is required.'), matches(PATTERNS.personName, MESSAGES.personName)],
                      lastName: [required('Last name is required.'), matches(PATTERNS.personName, MESSAGES.personName)],
                      email: [required('Email is required.'), matches(PATTERNS.email, MESSAGES.email)],
                      phone: [matches(PATTERNS.phone, MESSAGES.phone)],
                  }
                : { existingEmployeeCode: [required('Enter your employee code.')] }
        const nextErrors = {
            ...validate(form, {
                ...rules,
                username: [required('Username is required.'), matches(PATTERNS.username, MESSAGES.username)],
                ...(status?.setupTokenRequired ? { setupToken: [required('Enter the setup token.')] } : {}),
            }),
            ...validatePasswordPair(form.password, form.confirmPassword),
        }
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
            return
        }

        const body =
            mode === 'new'
                ? {
                      employeeCode: form.employeeCode.trim(),
                      firstName: form.firstName.trim(),
                      lastName: form.lastName.trim(),
                      email: form.email.trim(),
                      phone: form.phone.trim() || null,
                  }
                : { existingEmployeeCode: form.existingEmployeeCode.trim() }

        setSaving(true)
        try {
            await setupApi.createFirstAdmin({
                ...body,
                username: form.username.trim(),
                password: form.password,
                setupToken: form.setupToken.trim() || null,
            })
            toast.success('Administrator account created. Sign in to continue.')
            navigate('/login', { replace: true, state: { username: form.username.trim() } })
        } catch (error) {
            setErrors(getFieldErrors(error))
            setFormError(getErrorMessage(error, 'Could not create the administrator.'))
        } finally {
            setSaving(false)
        }
    }

    const field = (name, label, props = {}) => (
        <TextField
            label={label}
            value={form[name]}
            onChange={change(name)}
            error={Boolean(errors[name])}
            helperText={errors[name] || props.helperText}
            {...props}
        />
    )

    let content
    if (!status && !loadError) {
        content = <Loading />
    } else if (loadError) {
        content = <Alert severity="error">{getErrorMessage(loadError, 'Could not reach the server.')}</Alert>
    } else if (!status.setupRequired) {
        content = (
            <Stack spacing={2}>
                <Typography variant="h2">Setup is already complete</Typography>
                <p className="muted">An administrator exists. Sign in with your account.</p>
                <Button component={RouterLink} to="/login" variant="contained">
                    Go to sign in
                </Button>
            </Stack>
        )
    } else {
        content = (
            <form onSubmit={submit} noValidate>
                <Typography variant="h2">Create the administrator</Typography>
                <p className="muted" style={{ marginTop: 4 }}>
                    This one-time step creates the first account. You can add HR staff and employees after signing in.
                </p>

                <Stack spacing={2} sx={{ mt: 3 }}>
                    {formError ? <Alert severity="error">{formError}</Alert> : null}

                    <ToggleButtonGroup
                        exclusive
                        value={mode}
                        onChange={(_event, value) => value && setMode(value)}
                        size="small"
                        aria-label="Employee record"
                    >
                        <ToggleButton value="new">Create my employee profile</ToggleButton>
                        <ToggleButton value="existing">I&apos;m already an employee</ToggleButton>
                    </ToggleButtonGroup>

                    {mode === 'new' ? (
                        <div className="form-grid">
                            {field('firstName', 'First name', { autoComplete: 'given-name' })}
                            {field('lastName', 'Last name', { autoComplete: 'family-name' })}
                            {field('employeeCode', 'Employee code', { placeholder: 'EMP001' })}
                            {field('phone', 'Mobile number (optional)', { inputMode: 'numeric' })}
                            {field('email', 'Work email', { className: 'span-2', type: 'email', autoComplete: 'email' })}
                        </div>
                    ) : (
                        field('existingEmployeeCode', 'Your employee code', {
                            helperText: 'The account will be linked to this existing employee record.',
                        })
                    )}

                    {field('username', 'Username', { autoComplete: 'username' })}
                    <div className="form-grid">
                        <PasswordField
                            label="Password"
                            value={form.password}
                            onChange={change('password')}
                            error={Boolean(errors.password)}
                            helperText={errors.password || MESSAGES.password}
                            autoComplete="new-password"
                        />
                        <PasswordField
                            label="Confirm password"
                            value={form.confirmPassword}
                            onChange={change('confirmPassword')}
                            error={Boolean(errors.confirmPassword)}
                            helperText={errors.confirmPassword}
                            autoComplete="new-password"
                        />
                    </div>
                    {status.setupTokenRequired
                        ? field('setupToken', 'Setup token', {
                              helperText: errors.setupToken || 'The SETUP_TOKEN value configured on the server.',
                          })
                        : null}

                    <Button type="submit" variant="contained" size="large" disabled={saving}>
                        {saving ? 'Creating…' : 'Create administrator'}
                    </Button>
                </Stack>
            </form>
        )
    }

    return (
        <div className="auth-page">
            <aside className="auth-aside">
                <BrandMark size={44} />
                <h1>Let&apos;s open the register.</h1>
                <p>Create the administrator account to start adding departments, people and their workdays.</p>
                <DecorativeRegister />
            </aside>
            <main className="auth-main">
                <div className="auth-form" style={{ width: 'min(560px, 100%)' }}>
                    {content}
                </div>
            </main>
        </div>
    )
}
