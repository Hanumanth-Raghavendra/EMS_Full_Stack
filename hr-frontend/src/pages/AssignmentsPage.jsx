import { useSearchParams } from 'react-router-dom'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Add from '@mui/icons-material/Add'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import { getErrorMessage } from '../api/client'
import { assignmentsApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import FormDialog from '../components/ui/FormDialog'
import PageHeader from '../components/ui/PageHeader'
import SelectField from '../components/ui/SelectField'
import StatusLabel from '../components/ui/StatusLabel'
import { useConfirm, useToast } from '../context/contexts'
import { useEntityDialog } from '../hooks/useEntityDialog'
import { useFetch } from '../hooks/useFetch'
import { useEmployeeOptions, useProjectOptions } from '../hooks/useLookups'
import { formatDate } from '../utils/format'
import { maxLength, required, validate } from '../utils/validation'

export default function AssignmentsPage() {
    const toast = useToast()
    const confirm = useConfirm()
    const [params, setParams] = useSearchParams()
    const projectId = params.get('projectId') || ''
    const employeeId = params.get('employeeId') || ''

    const projects = useProjectOptions()
    const assignableProjects = useProjectOptions({ assignableOnly: true })
    const employees = useEmployeeOptions({ activeOnly: false })
    const activeEmployees = useEmployeeOptions({ activeOnly: true })
    const assignments = useFetch(() => assignmentsApi.list({ projectId, employeeId }), [projectId, employeeId])

    const setFilter = (name) => (event) => {
        const next = new URLSearchParams(params)
        if (event.target.value) {
            next.set(name, event.target.value)
        } else {
            next.delete(name)
        }
        setParams(next, { replace: true })
    }

    const dialog = useEntityDialog({
        toForm: (record) => ({
            employeeId: record?.employeeId || '',
            projectId: record?.projectId || projectId || '',
            roleInProject: record?.roleInProject || '',
        }),
        validate: (form, record) =>
            validate(form, {
                ...(record
                    ? {}
                    : {
                          employeeId: [required('Choose an employee.')],
                          projectId: [required('Choose a project.')],
                      }),
                roleInProject: [required('Describe their role, e.g. Developer.'), maxLength(100)],
            }),
        save: (form, record) =>
            record
                ? assignmentsApi.update(record.employeeId, record.projectId, { roleInProject: form.roleInProject.trim() })
                : assignmentsApi.create({
                      employeeId: Number(form.employeeId),
                      projectId: Number(form.projectId),
                      roleInProject: form.roleInProject.trim(),
                  }),
        onSaved: (_result, record) => {
            toast.success(record ? 'Role updated.' : 'Added to the project.')
            assignments.reload()
        },
    })

    const remove = async (row) => {
        const ok = await confirm({
            title: 'Remove from project?',
            message: `${row.employeeName} will no longer be on ${row.projectName}.`,
            confirmText: 'Remove',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await assignmentsApi.remove(row.employeeId, row.projectId)
            toast.success('Removed from the project.')
            assignments.reload()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const columns = [
        {
            key: 'project',
            header: 'Project',
            render: (row) => (
                <>
                    <span className="cell-primary">{row.projectName}</span>
                    <StatusLabel value={row.projectStatus} />
                </>
            ),
        },
        {
            key: 'employee',
            header: 'Employee',
            render: (row) => (
                <>
                    <span>{row.employeeName}</span>
                    <span className="cell-secondary">{row.employeeCode}</span>
                </>
            ),
        },
        { key: 'roleInProject', header: 'Role' },
        { key: 'assigned', header: 'Assigned', render: (row) => <span className="numeric">{formatDate(row.assignedAt)}</span> },
        {
            key: 'actions',
            header: <span className="visually-hidden">Actions</span>,
            align: 'right',
            render: (row) => (
                <span className="row-actions">
                    <Tooltip title="Change role">
                        <IconButton size="small" onClick={() => dialog.open(row)} aria-label="Change role">
                            <EditOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove from project">
                        <IconButton size="small" onClick={() => remove(row)} aria-label="Remove from project">
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
                title="Project teams"
                description="Who works on which project, and in what role."
                actions={
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => dialog.open()}
                        disabled={assignableProjects.options.length === 0}
                    >
                        Assign someone
                    </Button>
                }
            />
            <div className="toolbar">
                <SelectField className="grow" label="Project" value={projectId} onChange={setFilter('projectId')} options={projects.options} emptyLabel="All projects" />
                <SelectField className="grow" label="Employee" value={employeeId} onChange={setFilter('employeeId')} options={employees.options} emptyLabel="Everyone" />
            </div>
            <DataTable
                label="Project assignments"
                columns={columns}
                rows={assignments.data}
                rowKey={(row) => `${row.employeeId}-${row.projectId}`}
                loading={assignments.loading}
                error={assignments.error}
                onRetry={assignments.reload}
                empty={{
                    title: projectId || employeeId ? 'No one assigned here yet' : 'No project assignments yet',
                    message: 'Assign people to planned or active projects.',
                }}
            />

            <FormDialog
                open={dialog.isOpen}
                title={dialog.editing ? 'Change role' : 'Assign to a project'}
                description={dialog.editing ? `${dialog.record.employeeName} on ${dialog.record.projectName}` : undefined}
                onClose={dialog.close}
                onSubmit={dialog.submit}
                submitting={dialog.saving}
                submitLabel={dialog.editing ? 'Save role' : 'Assign'}
                error={dialog.error}
            >
                <Stack spacing={2}>
                    {!dialog.editing ? (
                        <>
                            <SelectField
                                label="Project"
                                required
                                options={assignableProjects.options}
                                {...dialog.field('projectId')}
                                helperText={dialog.errors.projectId || 'Only planned and active projects are listed.'}
                            />
                            <SelectField label="Employee" required options={activeEmployees.options} {...dialog.field('employeeId')} />
                        </>
                    ) : null}
                    <TextField label="Role in project" placeholder="Developer" required autoFocus={dialog.editing} {...dialog.field('roleInProject')} />
                </Stack>
            </FormDialog>
        </>
    )
}
