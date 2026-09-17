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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

import api from '../api/axios'
import PrimaryButton from '../components/ui/PrimaryButton'
import PageHeader from '../components/ui/PageHeader'
import ActionButton from '../components/ui/ActionButton'
import SearchInput from '../components/ui/SearchInput'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'
import { sortById } from '../utils/sortById'

function Designations() {
    const [designations, setDesignations] = useState([])
    const [departments, setDepartments] = useState([])

    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingDesignation, setEditingDesignation] =
        useState(null)

    const [designationName, setDesignationName] =
        useState('')
    const [departmentId, setDepartmentId] =
        useState('')

    const [designationToDelete, setDesignationToDelete] =
        useState(null)

    const loadDesignations = useCallback(async () => {
        try {
            setLoading(true)
            setError('')

            const response = await api.get(
                '/api/designations'
            )

            setDesignations(
                sortById(response.data, 'designationId')
            )
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load designations.'
            )
        } finally {
            setLoading(false)
        }
    }, [])

    const loadDepartments = useCallback(async () => {
        try {
            const response = await api.get(
                '/api/departments'
            )

            setDepartments(response.data)
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'Unable to load departments.'
            )
        }
    }, [])

    useEffect(() => {
        loadDesignations()
        loadDepartments()
    }, [
        loadDesignations,
        loadDepartments,
    ])

    const filteredDesignations = useMemo(() => {
        const q = query.trim().toLowerCase()

        if (!q) {
            return designations
        }

        return designations.filter(
            (designation) =>
                [
                    designation.designationName,
                    designation.departmentName,
                ].some((value) =>
                    String(value ?? '')
                        .toLowerCase()
                        .includes(q)
                )
        )
    }, [designations, query])

    const openAddDialog = () => {
        setEditingDesignation(null)
        setDesignationName('')
        setDepartmentId('')
        setError('')
        setDialogOpen(true)
    }

    const openEditDialog = (designation) => {
        setEditingDesignation(designation)
        setDesignationName(
            designation.designationName || ''
        )

        setDepartmentId(
            designation.departmentId
                ? String(designation.departmentId)
                : ''
        )

        setError('')
        setDialogOpen(true)
    }

    const closeDialog = () => {
        if (saving) {
            return
        }

        setDialogOpen(false)
        setEditingDesignation(null)
        setDesignationName('')
        setDepartmentId('')
    }

    const saveDesignation = async (event) => {
        event.preventDefault()

        const trimmedName =
            designationName.trim()

        if (!trimmedName) {
            setError(
                'Designation name is required.'
            )
            return
        }

        if (!departmentId) {
            setError(
                'Department is required.'
            )
            return
        }

        try {
            setSaving(true)
            setError('')

            const data = {
                designationName: trimmedName,
                departmentId: Number(
                    departmentId
                ),
            }

            if (editingDesignation) {
                await api.put(
                    `/api/designations/${editingDesignation.designationId}`,
                    data
                )
            } else {
                await api.post(
                    '/api/designations',
                    data
                )
            }

            closeDialog()
            await loadDesignations()
        } catch (err) {
            setError(
                err.response?.data?.message ||
                (
                    editingDesignation
                        ? 'Unable to update designation.'
                        : 'Unable to create designation.'
                )
            )
        } finally {
            setSaving(false)
        }
    }

    const remove = useCallback(
        async (designation) => {
            try {
                setError('')

                await api.delete(
                    `/api/designations/${designation.designationId}`
                )

                setDesignations((items) =>
                    items.filter(
                        (item) =>
                            item.designationId !==
                            designation.designationId
                    )
                )
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    'Unable to delete designation. Related records may exist.'
                )
            }
        },
        []
    )

    return (
        <div className="page-container">
            <PageHeader
                title="Designations"
                description="Manage employee job designations."
                action={
                    <PrimaryButton
                        onClick={openAddDialog}
                    >
                        + Add Designation
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
                    placeholder="Search designations..."
                />

                <span>
                    {filteredDesignations.length} records
                </span>
            </div>

            <div className="table-card">
                {loading ? (
                    <LoadingState
                        message="Loading designations..."
                    />
                ) : filteredDesignations.length === 0 ? (
                    <EmptyState
                        title="No designations found"
                        message="There are no designations matching your search."
                    />
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Designation</th>
                                    <th>Department</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredDesignations.map(
                                    (designation) => (
                                        <tr
                                            key={
                                                designation.designationId
                                            }
                                        >
                                            <td>
                                                {
                                                    designation.designationId
                                                }
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        designation.designationName
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    designation.departmentName ||
                                                    '—'
                                                }
                                            </td>

                                            <td>
                                                <div className="action-buttons">
                                                    <ActionButton
                                                        onClick={() =>
                                                            openEditDialog(
                                                                designation
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </ActionButton>

                                                    <ActionButton
                                                        color="error"
                                                        onClick={() =>
                                                            setDesignationToDelete(
                                                                designation
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
                    onSubmit={saveDesignation}
                >
                    <DialogTitle>
                        {editingDesignation
                            ? 'Edit Designation'
                            : 'Add Designation'}
                    </DialogTitle>

                    <DialogContent>
                        <TextField
                            autoFocus
                            fullWidth
                            required
                            label="Designation Name"
                            value={designationName}
                            onChange={(event) =>
                                setDesignationName(
                                    event.target.value
                                )
                            }
                            placeholder="e.g. Software Engineer"
                            margin="dense"
                            disabled={saving}
                        />

                        <FormControl
                            fullWidth
                            margin="dense"
                            required
                            disabled={saving}
                        >
                            <InputLabel>
                                Department
                            </InputLabel>

                            <Select
                                value={departmentId}
                                label="Department"
                                onChange={(event) =>
                                    setDepartmentId(
                                        event.target.value
                                    )
                                }
                            >
                                <MenuItem value="">
                                    <em>
                                        Select Department
                                    </em>
                                </MenuItem>

                                {departments.map(
                                    (department) => (
                                        <MenuItem
                                            key={
                                                department.departmentId
                                            }
                                            value={String(
                                                department.departmentId
                                            )}
                                        >
                                            {
                                                department.departmentName
                                            }
                                        </MenuItem>
                                    )
                                )}
                            </Select>
                        </FormControl>
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
                                : editingDesignation
                                    ? 'Save Changes'
                                    : 'Add Designation'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            <ConfirmDialog
                open={Boolean(
                    designationToDelete
                )}
                title="Delete Designation"
                message={
                    designationToDelete
                        ? `Are you sure you want to delete the ${designationToDelete.designationName} designation?`
                        : ''
                }
                onCancel={() =>
                    setDesignationToDelete(null)
                }
                onConfirm={async () => {
                    if (designationToDelete) {
                        await remove(
                            designationToDelete
                        )
                        setDesignationToDelete(null)
                    }
                }}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    )
}

export default Designations