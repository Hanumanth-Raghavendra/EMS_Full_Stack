import { useState } from 'react'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Add from '@mui/icons-material/Add'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
import { getErrorMessage } from '../api/client'
import { usersApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import FormDialog from '../components/ui/FormDialog'
import PageHeader from '../components/ui/PageHeader'
import PasswordField from '../components/ui/PasswordField'
import RoleTag from '../components/ui/RoleTag'
import SelectField from '../components/ui/SelectField'
import StatusLabel from '../components/ui/StatusLabel'
import { useConfirm, useToast } from '../context/contexts'
import { useAuth } from '../hooks/useAuth'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useEntityDialog } from '../hooks/useEntityDialog'
import { useFetch } from '../hooks/useFetch'
import { useEmployeeOptions } from '../hooks/useLookups'
import { ROLES, assignableRoles } from '../utils/constants'
import { formatDateTime } from '../utils/format'
import { MESSAGES, PATTERNS, matches, required, validate } from '../utils/validation'

function suggestUsername(label = '') {
    const name = label.replace(/\s*\(.*\)$/, '').trim().toLowerCase()
    return name.replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')
}

export default function UsersPage() {
    const { isAdmin } = useAuth()
    const toast = useToast()
    const confirm = useConfirm()
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())
    const users = useFetch(() => usersApi.list(debouncedSearch), [debouncedSearch])
    const [resetTarget, setResetTarget] = useState(null)
    const [newPassword, setNewPassword] = useState('')
    const [resetError, setResetError] = useState('')
    const [resetting, setResetting] = useState(false)
    const roleOptions = assignableRoles(isAdmin)

    const candidates = useEmployeeOptions({ withoutAccount: true })

    const createDialog = useEntityDialog({
        toForm: () => ({ employeeId: '', username: '', password: '', role: ROLES.EMPLOYEE }),
        validate: (form) =>
            validate(form, {
                employeeId: [required('Choose an employee.')],
                username: [required('Username is required.'), matches(PATTERNS.username, MESSAGES.username)],
                password: [required('Password is required.'), matches(PATTERNS.password, MESSAGES.password)],
                role: [required('Choose a role.')],
            }),
        save: (form) =>
            usersApi.create({
                employeeId: Number(form.employeeId),
                username: form.username.trim(),
                password: form.password,
                role: form.role,
                enabled: true,
            }),
        onSaved: (user) => {
            toast.success(`Account ${user.username} created. Share the password with ${user.employeeName} securely.`)
            users.reload()
            candidates.reload()
        },
    })

    const editDialog = useEntityDialog({
        toForm: (record) => ({ username: record?.username || '', role: record?.role || ROLES.EMPLOYEE, enabled: record?.enabled ?? true }),
        validate: (form) =>
            validate(form, {
                username: [required('Username is required.'), matches(PATTERNS.username, MESSAGES.username)],
            }),
        save: (form, record) =>
            usersApi.update(record.userId, { username: form.username.trim(), role: form.role, enabled: form.enabled }),
        onSaved: () => {
            toast.success('Account updated. The person will need to sign in again.')
            users.reload()
        },
    })

    const remove = async (user) => {
        const ok = await confirm({
            title: `Delete the account ${user.username}?`,
            message: `${user.employeeName} will no longer be able to sign in. Their employee record is kept.`,
            confirmText: 'Delete account',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await usersApi.remove(user.userId)
            toast.success('Account deleted.')
            users.reload()
            candidates.reload()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const submitReset = async () => {
        if (!PATTERNS.password.test(newPassword)) {
            setResetError(MESSAGES.password)
            return
        }
        setResetting(true)
        try {
            await usersApi.resetPassword(resetTarget.userId, newPassword)
            toast.success(`Password reset for ${resetTarget.username}. They have been signed out everywhere.`)
            setResetTarget(null)
        } catch (error) {
            setResetError(getErrorMessage(error))
        } finally {
            setResetting(false)
        }
    }

    const columns = [
        {
            key: 'username',
            header: 'Account',
            render: (row) => (
                <>
                    <span className="cell-primary">
                        {row.username} {row.self ? <span className="muted">(you)</span> : null}
                    </span>
                    <span className="cell-secondary">
                        {row.employeeName}, {row.employeeCode}
                    </span>
                </>
            ),
        },
        { key: 'role', header: 'Role', render: (row) => <RoleTag role={row.role} /> },
        {
            key: 'status',
            header: 'Can sign in',
            render: (row) =>
                !row.employeeActive ? (
                    <StatusLabel value="INACTIVE" label="No, employee inactive" />
                ) : row.enabled ? (
                    <StatusLabel value="ENABLED" label="Yes" />
                ) : (
                    <StatusLabel value="DISABLED" label="No, disabled" />
                ),
        },
        {
            key: 'lastLogin',
            header: 'Last sign-in',
            render: (row) => <span className="numeric">{row.lastLoginAt ? formatDateTime(row.lastLoginAt) : 'Never'}</span>,
        },
        {
            key: 'actions',
            header: <span className="visually-hidden">Actions</span>,
            align: 'right',
            render: (row) =>
                row.canManage ? (
                    <span className="row-actions">
                        <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => editDialog.open(row)} aria-label={`Edit ${row.username}`}>
                                <EditOutlined fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Reset password">
                            <IconButton
                                size="small"
                                onClick={() => {
                                    setResetTarget(row)
                                    setNewPassword('')
                                    setResetError('')
                                }}
                                aria-label={`Reset password for ${row.username}`}
                            >
                                <KeyOutlined fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete account">
                            <IconButton size="small" onClick={() => remove(row)} aria-label={`Delete ${row.username}`}>
                                <DeleteOutlineOutlined fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </span>
                ) : row.self ? (
                    <span className="muted" style={{ fontSize: 13 }}>
                        Manage in My profile
                    </span>
                ) : (
                    <Tooltip title="Only administrators can manage HR and administrator accounts">
                        <span className="muted" style={{ fontSize: 13 }}>
                            Restricted
                        </span>
                    </Tooltip>
                ),
        },
    ]

    return (
        <>
            <PageHeader
                title="User accounts"
                description={
                    isAdmin
                        ? 'Who can sign in, and with which role.'
                        : 'Who can sign in. HR can create and manage employee accounts; administrators manage HR and admin accounts.'
                }
                actions={
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => createDialog.open()}
                        disabled={!candidates.loading && candidates.options.length === 0}
                    >
                        Create account
                    </Button>
                }
            />
            <div className="toolbar">
                <TextField className="grow" label="Search" placeholder="Username, name or code" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <DataTable
                label="User accounts"
                columns={columns}
                rows={users.data}
                rowKey={(row) => row.userId}
                loading={users.loading}
                error={users.error}
                onRetry={users.reload}
                empty={{ title: search ? 'No accounts match' : 'No accounts yet' }}
            />

            <FormDialog
                open={createDialog.isOpen}
                title="Create account"
                description="Give an existing employee a username and password to sign in."
                onClose={createDialog.close}
                onSubmit={createDialog.submit}
                submitting={createDialog.saving}
                submitLabel="Create account"
                error={createDialog.error}
            >
                <Stack spacing={2}>
                    <SelectField
                        label="Employee"
                        required
                        options={candidates.options}
                        {...createDialog.field('employeeId')}
                        onChange={(event) => {
                            const option = candidates.options.find((item) => item.value === event.target.value)
                            createDialog.setForm((current) => ({
                                ...current,
                                employeeId: event.target.value,
                                username: current.username || suggestUsername(option?.label),
                            }))
                        }}
                        helperText={createDialog.errors.employeeId || 'Only active employees without an account are listed.'}
                    />
                    <TextField label="Username" required {...createDialog.field('username')} helperText={createDialog.errors.username || MESSAGES.username} />
                    <PasswordField label="Temporary password" required {...createDialog.field('password')} helperText={createDialog.errors.password || MESSAGES.password} autoComplete="new-password" />
                    <SelectField
                        label="Role"
                        required
                        options={roleOptions}
                        {...createDialog.field('role')}
                        helperText={isAdmin ? undefined : 'HR can create employee accounts only.'}
                    />
                </Stack>
            </FormDialog>

            <FormDialog
                open={editDialog.isOpen}
                title={`Edit ${editDialog.record?.username || 'account'}`}
                onClose={editDialog.close}
                onSubmit={editDialog.submit}
                submitting={editDialog.saving}
                submitLabel="Save changes"
                error={editDialog.error}
            >
                <Stack spacing={2}>
                    <TextField label="Username" required {...editDialog.field('username')} />
                    <SelectField label="Role" required options={roleOptions} {...editDialog.field('role')} />
                    <FormControlLabel
                        control={
                            <Switch
                                checked={Boolean(editDialog.form.enabled)}
                                onChange={(event) => editDialog.setForm((current) => ({ ...current, enabled: event.target.checked }))}
                            />
                        }
                        label={editDialog.form.enabled ? 'Can sign in' : 'Disabled: cannot sign in'}
                    />
                </Stack>
            </FormDialog>

            <FormDialog
                open={Boolean(resetTarget)}
                title={`Reset password for ${resetTarget?.username || ''}`}
                description="They will be signed out everywhere and need the new password to sign in."
                onClose={() => setResetTarget(null)}
                onSubmit={submitReset}
                submitting={resetting}
                submitLabel="Reset password"
                error={resetError}
            >
                <PasswordField
                    label="New password"
                    value={newPassword}
                    onChange={(event) => {
                        setNewPassword(event.target.value)
                        setResetError('')
                    }}
                    helperText={MESSAGES.password}
                    autoComplete="new-password"
                    autoFocus
                />
            </FormDialog>
        </>
    )
}
