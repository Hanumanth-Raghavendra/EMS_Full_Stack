import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

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

function Departments() {
    const [departments, setDepartments] = useState([])
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingDepartment, setEditingDepartment] =
        useState(null)
    const [departmentName, setDepartmentName] =
        useState('')
    const [description, setDescription] =
        useState('')

    const [departmentToDelete, setDepartmentToDelete] =
        useState(null)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            const response = await api.get(
                '/api/departments'
            )

            setDepartments(
                sortById(response.data, 'departmentId')
            )
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load departments.'
            )
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filteredDepartments = useMemo(() => {
        const q = query.trim().toLowerCase()

        if (!q) {
            return departments
        }

        return departments.filter((department) =>
            [
                department.departmentName,
                department.description,
            ].some((value) =>
                String(value ?? '')
                    .toLowerCase()
                    .includes(q)
            )
        )
    }, [departments, query])

    const openAddDialog = () => {
        setEditingDepartment(null)
        setDepartmentName('')
        setDescription('')
        setError('')
        setDialogOpen(true)
    }

    const openEditDialog = (department) => {
        setEditingDepartment(department)
        setDepartmentName(
            department.departmentName || ''
        )
        setDescription(
            department.description || ''
        )
        setError('')
        setDialogOpen(true)
    }

    const closeDialog = () => {
        if (saving) {
            return
        }

        setDialogOpen(false)
        setEditingDepartment(null)
        setDepartmentName('')
        setDescription('')
    }

    const saveDepartment = async (event) => {
        event.preventDefault()

        const trimmedName =
            departmentName.trim()

        const trimmedDescription =
            description.trim()

        if (!trimmedName) {
            setError(
                'Department name is required.'
            )
            return
        }

        try {
            setSaving(true)
            setError('')

            const data = {
                departmentName: trimmedName,
                description:
                    trimmedDescription || null,
            }

            if (editingDepartment) {
                await api.put(
                    `/api/departments/${editingDepartment.departmentId}`,
                    data
                )
            } else {
                await api.post(
                    '/api/departments',
                    data
                )
            }

            closeDialog()
            await load()
        } catch (err) {
            setError(
                err.response?.data?.message ||
                (
                    editingDepartment
                        ? 'Unable to update department.'
                        : 'Unable to create department.'
                )
            )
        } finally {
            setSaving(false)
        }
    }

    const remove = useCallback(async (department) => {
        try {
            setError('')

            await api.delete(
                `/api/departments/${department.departmentId}`
            )

            setDepartments((items) =>
                items.filter(
                    (item) =>
                        item.departmentId !==
                        department.departmentId
                )
            )
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to delete department. Related records may exist.'
            )
        }
    }, [])

    return (
        <div className="page-container">
            <PageHeader
                title="Departments"
                description="Manage organization departments."
                action={
                    <PrimaryButton
                        onClick={openAddDialog}
                    >
                        + Add Department
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
                    placeholder="Search departments..."
                />

                <span>
                    {filteredDepartments.length} records
                </span>
            </div>

            <div className="table-card">
                {loading ? (
                    <LoadingState
                        message="Loading departments..."
                    />
                ) : filteredDepartments.length === 0 ? (
                    <EmptyState
                        title="No departments found"
                        message="There are no departments matching your search."
                    />
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Department</th>
                                    <th>Description</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredDepartments.map(
                                    (department) => (
                                        <tr
                                            key={
                                                department.departmentId
                                            }
                                        >
                                            <td>
                                                {
                                                    department.departmentId
                                                }
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        department.departmentName
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    department.description ||
                                                    '—'
                                                }
                                            </td>

                                            <td>
                                                <div className="action-buttons">
                                                    <ActionButton
                                                        onClick={() =>
                                                            openEditDialog(
                                                                department
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </ActionButton>

                                                    <ActionButton
                                                        color="error"
                                                        onClick={() =>
                                                            setDepartmentToDelete(
                                                                department
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
                <form
                    onSubmit={saveDepartment}
                >
                    <DialogTitle>
                        {editingDepartment
                            ? 'Edit Department'
                            : 'Add Department'}
                    </DialogTitle>

                    <DialogContent>
                        <TextField
                            autoFocus
                            fullWidth
                            required
                            label="Department Name"
                            value={departmentName}
                            onChange={(event) =>
                                setDepartmentName(
                                    event.target.value
                                )
                            }
                            placeholder="e.g. Engineering"
                            margin="dense"
                            disabled={saving}
                        />

                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Description"
                            value={description}
                            onChange={(event) =>
                                setDescription(
                                    event.target.value
                                )
                            }
                            placeholder="Describe the department..."
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
                                : editingDepartment
                                    ? 'Save Changes'
                                    : 'Add Department'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <ConfirmDialog
                open={Boolean(
                    departmentToDelete
                )}
                title="Delete Department"
                message={
                    departmentToDelete
                        ? `Are you sure you want to delete the ${departmentToDelete.departmentName} department?`
                        : ''
                }
                onCancel={() =>
                    setDepartmentToDelete(null)
                }
                onConfirm={async () => {
                    if (departmentToDelete) {
                        await remove(
                            departmentToDelete
                        )
                        setDepartmentToDelete(null)
                    }
                }}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    )
}

export default Departments