import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Add from '@mui/icons-material/Add'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import { Link as RouterLink } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import { departmentsApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import FormDialog from '../components/ui/FormDialog'
import PageHeader from '../components/ui/PageHeader'
import { useConfirm, useToast } from '../context/contexts'
import { useEntityDialog } from '../hooks/useEntityDialog'
import { useFetch } from '../hooks/useFetch'
import { maxLength, required, validate } from '../utils/validation'

export default function DepartmentsPage() {
    const toast = useToast()
    const confirm = useConfirm()
    const departments = useFetch(() => departmentsApi.list(), [])

    const dialog = useEntityDialog({
        toForm: (record) => ({
            departmentName: record?.departmentName || '',
            description: record?.description || '',
        }),
        validate: (form) =>
            validate(form, {
                departmentName: [required('Department name is required.'), maxLength(100)],
                description: [maxLength(500)],
            }),
        save: (form, record) => {
            const body = { departmentName: form.departmentName.trim(), description: form.description.trim() || null }
            return record ? departmentsApi.update(record.departmentId, body) : departmentsApi.create(body)
        },
        onSaved: (_result, record) => {
            toast.success(record ? 'Department updated.' : 'Department added.')
            departments.reload()
        },
    })

    const remove = async (department) => {
        const ok = await confirm({
            title: `Delete ${department.departmentName}?`,
            message: 'Departments can only be deleted when no employees or designations belong to them.',
            confirmText: 'Delete',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await departmentsApi.remove(department.departmentId)
            toast.success('Department deleted.')
            departments.reload()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const columns = [
        {
            key: 'name',
            header: 'Department',
            render: (row) => (
                <>
                    <span className="cell-primary">{row.departmentName}</span>
                    {row.description ? <span className="cell-secondary">{row.description}</span> : null}
                </>
            ),
        },
        {
            key: 'employees',
            header: 'Employees',
            align: 'right',
            render: (row) => (
                <RouterLink to={`/employees?departmentId=${row.departmentId}`} className="numeric">
                    {row.employeeCount}
                </RouterLink>
            ),
        },
        {
            key: 'designations',
            header: 'Designations',
            align: 'right',
            render: (row) => <span className="numeric">{row.designationCount}</span>,
        },
        {
            key: 'actions',
            header: <span className="visually-hidden">Actions</span>,
            align: 'right',
            render: (row) => (
                <span className="row-actions">
                    <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => dialog.open(row)} aria-label={`Edit ${row.departmentName}`}>
                            <EditOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(row)} aria-label={`Delete ${row.departmentName}`}>
                            <DeleteOutlineOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </span>
            ),
        },
    ]

    return (
        <>
            <PageHeader
                title="Departments"
                description="The teams employees belong to. Each department has its own designations."
                actions={
                    <Button variant="contained" startIcon={<Add />} onClick={() => dialog.open()}>
                        Add department
                    </Button>
                }
            />
            <DataTable
                label="Departments"
                columns={columns}
                rows={departments.data}
                rowKey={(row) => row.departmentId}
                loading={departments.loading}
                error={departments.error}
                onRetry={departments.reload}
                empty={{
                    title: 'No departments yet',
                    message: 'Departments group your employees, for example Engineering or Finance.',
                    action: (
                        <Button variant="contained" onClick={() => dialog.open()}>
                            Add department
                        </Button>
                    ),
                }}
            />

            <FormDialog
                open={dialog.isOpen}
                title={dialog.editing ? 'Edit department' : 'Add department'}
                onClose={dialog.close}
                onSubmit={dialog.submit}
                submitting={dialog.saving}
                submitLabel={dialog.editing ? 'Save changes' : 'Add department'}
                error={dialog.error}
            >
                <Stack spacing={2}>
                    <TextField label="Name" autoFocus required {...dialog.field('departmentName')} />
                    <TextField label="Description (optional)" multiline minRows={2} {...dialog.field('description')} />
                </Stack>
            </FormDialog>
        </>
    )
}
