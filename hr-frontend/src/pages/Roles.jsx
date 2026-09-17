import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

import api from '../api/axios'
import PrimaryButton from '../components/ui/PrimaryButton'
import PageHeader from '../components/ui/PageHeader'
import ActionButton from '../components/ui/ActionButton'
import SearchInput from '../components/ui/SearchInput'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import { sortById } from '../utils/sortById'

function Roles() {
    const navigate = useNavigate()

    const [roles, setRoles] = useState([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingRole, setEditingRole] = useState(null)
    const [roleName, setRoleName] = useState('')

    const [roleToDelete, setRoleToDelete] = useState(null)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            const response = await api.get(
                '/api/roles'
            )

            setRoles(
                sortById(response.data, 'roleId')
            )
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load roles.'
            )
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filteredRoles = useMemo(() => {
        const q = query.trim().toLowerCase()

        if (!q) {
            return roles
        }

        return roles.filter((role) =>
            String(role.roleName ?? '')
                .toLowerCase()
                .includes(q)
        )
    }, [roles, query])

    const openAddDialog = () => {
        setEditingRole(null)
        setRoleName('')
        setError('')
        setDialogOpen(true)
    }

    const openEditDialog = (role) => {
        setEditingRole(role)
        setRoleName(role.roleName || '')
        setError('')
        setDialogOpen(true)
    }

    const closeDialog = () => {
        if (saving) {
            return
        }

        setDialogOpen(false)
        setEditingRole(null)
        setRoleName('')
    }

    const saveRole = async (event) => {
        event.preventDefault()

        const trimmedName = roleName.trim()

        if (!trimmedName) {
            setError('Role name is required.')
            return
        }

        try {
            setSaving(true)
            setError('')

            if (editingRole) {
                await api.put(
                    `/api/roles/${editingRole.roleId}`,
                    {
                        roleName: trimmedName,
                    }
                )
            } else {
                await api.post(
                    '/api/roles',
                    {
                        roleName: trimmedName,
                    }
                )
            }

            closeDialog()
            await load()
        } catch (err) {
            setError(
                err.response?.data?.message ||
                (
                    editingRole
                        ? 'Unable to update role.'
                        : 'Unable to create role.'
                )
            )
        } finally {
            setSaving(false)
        }
    }

    const remove = useCallback(async (role) => {
        try {
            setError('')

            await api.delete(
                `/api/roles/${role.roleId}`
            )

            setRoles((items) =>
                items.filter(
                    (item) =>
                        item.roleId !== role.roleId
                )
            )
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to delete role.'
            )
        }
    }, [])

    return (
        <div className="page-container">
            <PageHeader
                title="Roles"
                description="Define application access roles."
                action={
                    <PrimaryButton
                        onClick={openAddDialog}
                    >
                        + Add Role
                    </PrimaryButton>
                }
            />

            {error && (
                <div className="error-banner">
                    {error}
                </div>
            )}

            <div className="toolbar">
                <SearchInput
                    value={query}
                    onChange={(event) =>
                        setQuery(event.target.value)
                    }
                    placeholder="Search roles..."
                />

                <span>
                    {filteredRoles.length} records
                </span>
            </div>

            <div className="table-card">
                {loading ? (
                    <LoadingState
                        message="Loading roles..."
                    />
                ) : filteredRoles.length === 0 ? (
                    <EmptyState
                        title="No roles found"
                        message="There are no roles matching your search."
                    />
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Role Name</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRoles.map(
                                    (role) => (
                                        <tr
                                            key={
                                                role.roleId
                                            }
                                        >
                                            <td>
                                                {
                                                    role.roleId
                                                }
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        role.roleName
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                <div className="action-buttons">
                                                    <ActionButton
                                                        onClick={() =>
                                                            openEditDialog(
                                                                role
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </ActionButton>

                                                    <ActionButton
                                                        color="error"
                                                        onClick={() =>
                                                            setRoleToDelete(
                                                                role
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </ActionButton>
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

            <Dialog
                open={dialogOpen}
                onClose={closeDialog}
                maxWidth="sm"
                fullWidth
            >
                <form onSubmit={saveRole}>
                    <DialogTitle>
                        {editingRole
                            ? 'Edit Role'
                            : 'Add Role'}
                    </DialogTitle>

                    <DialogContent>
                        <TextField
                            autoFocus
                            fullWidth
                            label="Role Name"
                            value={roleName}
                            onChange={(event) =>
                                setRoleName(
                                    event.target.value
                                )
                            }
                            placeholder="e.g. HR"
                            margin="dense"
                            disabled={saving}
                        />
                    </DialogContent>

                    <DialogActions>
                        <Button
                            type="button"
                            onClick={closeDialog}
                            disabled={saving}
                            color="inherit"
                            sx={{
                                textTransform: 'none',
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            variant="contained"
                            disabled={saving}
                            sx={{
                                textTransform: 'none',
                            }}
                        >
                            {saving
                                ? 'Saving...'
                                : editingRole
                                    ? 'Save Changes'
                                    : 'Add Role'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <ConfirmDialog
                open={Boolean(roleToDelete)}
                title="Delete Role"
                message={
                    roleToDelete
                        ? `Are you sure you want to delete the ${roleToDelete.roleName} role?`
                        : ''
                }
                onCancel={() =>
                    setRoleToDelete(null)
                }
                onConfirm={async () => {
                    if (roleToDelete) {
                        await remove(roleToDelete)
                        setRoleToDelete(null)
                    }
                }}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    )
}

export default Roles