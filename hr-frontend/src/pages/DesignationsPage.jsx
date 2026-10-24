import { useState } from 'react'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Add from '@mui/icons-material/Add'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import { getErrorMessage } from '../api/client'
import { designationsApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import FormDialog from '../components/ui/FormDialog'
import PageHeader from '../components/ui/PageHeader'
import SelectField from '../components/ui/SelectField'
import { useConfirm, useToast } from '../context/contexts'
import { useEntityDialog } from '../hooks/useEntityDialog'
import { useFetch } from '../hooks/useFetch'
import { useDepartmentOptions } from '../hooks/useLookups'
import { maxLength, required, validate } from '../utils/validation'

export default function DesignationsPage() {
    const toast = useToast()
    const confirm = useConfirm()
    const [departmentId, setDepartmentId] = useState('')
    const departments = useDepartmentOptions()
    const designations = useFetch(() => designationsApi.list(departmentId || undefined), [departmentId])

    const dialog = useEntityDialog({
        toForm: (record) => ({
            designationName: record?.designationName || '',
            departmentId: record?.departmentId || departmentId || '',
        }),
        validate: (form) =>
            validate(form, {
                designationName: [required('Designation name is required.'), maxLength(100)],
                departmentId: [required('Choose a department.')],
            }),
        save: (form, record) => {
            const body = { designationName: form.designationName.trim(), departmentId: Number(form.departmentId) }
            return record ? designationsApi.update(record.designationId, body) : designationsApi.create(body)
        },
        onSaved: (_result, record) => {
            toast.success(record ? 'Designation updated.' : 'Designation added.')
            designations.reload()
        },
    })

    const remove = async (designation) => {
        const ok = await confirm({
            title: `Delete ${designation.designationName}?`,
            message: 'Designations can only be deleted when no employee holds them.',
            confirmText: 'Delete',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await designationsApi.remove(designation.designationId)
            toast.success('Designation deleted.')
            designations.reload()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const columns = [
        { key: 'designationName', header: 'Designation', render: (row) => <span className="cell-primary">{row.designationName}</span> },
        { key: 'departmentName', header: 'Department' },
        {
            key: 'employeeCount',
            header: 'Employees',
            align: 'right',
            render: (row) => <span className="numeric">{row.employeeCount}</span>,
        },
        {
            key: 'actions',
            header: <span className="visually-hidden">Actions</span>,
            align: 'right',
            render: (row) => (
                <span className="row-actions">
                    <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => dialog.open(row)} aria-label={`Edit ${row.designationName}`}>
                            <EditOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(row)} aria-label={`Delete ${row.designationName}`}>
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
                title="Designations"
                description="Job titles within each department."
                actions={
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => dialog.open()}
                        disabled={departments.options.length === 0}
                    >
                        Add designation
                    </Button>
                }
            />
            <div className="toolbar">
                <SelectField
                    className="filter"
                    label="Department"
                    value={departmentId}
                    onChange={(event) => setDepartmentId(event.target.value)}
                    options={departments.options}
                    emptyLabel="All departments"
                />
            </div>
            <DataTable
                label="Designations"
                columns={columns}
                rows={designations.data}
                rowKey={(row) => row.designationId}
                loading={designations.loading}
                error={designations.error}
                onRetry={designations.reload}
                empty={{
                    title: departments.options.length ? 'No designations yet' : 'Add a department first',
                    message: departments.options.length
                        ? 'Add job titles such as Software Engineer or Accountant.'
                        : 'Designations belong to a department.',
                }}
            />

            <FormDialog
                open={dialog.isOpen}
                title={dialog.editing ? 'Edit designation' : 'Add designation'}
                onClose={dialog.close}
                onSubmit={dialog.submit}
                submitting={dialog.saving}
                submitLabel={dialog.editing ? 'Save changes' : 'Add designation'}
                error={dialog.error}
            >
                <Stack spacing={2}>
                    <TextField label="Name" autoFocus required {...dialog.field('designationName')} />
                    <SelectField label="Department" required options={departments.options} {...dialog.field('departmentId')} />
                </Stack>
            </FormDialog>
        </>
    )
}
