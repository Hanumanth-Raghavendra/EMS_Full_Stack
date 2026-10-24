import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Add from '@mui/icons-material/Add'
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlined from '@mui/icons-material/EditOutlined'
import { getErrorMessage } from '../api/client'
import { assignmentsApi, projectsApi } from '../api/endpoints'
import DataTable from '../components/ui/DataTable'
import FormDialog from '../components/ui/FormDialog'
import PageHeader from '../components/ui/PageHeader'
import SelectField from '../components/ui/SelectField'
import StatusLabel from '../components/ui/StatusLabel'
import { useConfirm, useToast } from '../context/contexts'
import { useAuth } from '../hooks/useAuth'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useEntityDialog } from '../hooks/useEntityDialog'
import { useFetch } from '../hooks/useFetch'
import { PROJECT_STATUSES } from '../utils/constants'
import { formatDate, pluralize } from '../utils/format'
import { maxLength, required, validate } from '../utils/validation'

function MyProjects() {
    const assignments = useFetch(() => assignmentsApi.list(), [])
    const columns = [
        { key: 'project', header: 'Project', render: (row) => <span className="cell-primary">{row.projectName}</span> },
        { key: 'role', header: 'Your role', render: (row) => row.roleInProject },
        { key: 'status', header: 'Project status', render: (row) => <StatusLabel value={row.projectStatus} /> },
        { key: 'since', header: 'Assigned', render: (row) => <span className="numeric">{formatDate(row.assignedAt)}</span> },
    ]
    return (
        <>
            <PageHeader title="My projects" description="Projects you are assigned to and the role you play in each." />
            <DataTable
                label="My projects"
                columns={columns}
                rows={assignments.data}
                rowKey={(row) => row.projectId}
                loading={assignments.loading}
                error={assignments.error}
                onRetry={assignments.reload}
                empty={{
                    title: 'You are not on any project yet',
                    message: 'When HR assigns you to a project it will appear here.',
                }}
            />
        </>
    )
}

function validateProject(form) {
    const errors = validate(form, {
        projectName: [required('Project name is required.'), maxLength(150)],
        description: [maxLength(1000)],
        status: [required('Choose a status.')],
    })
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
        errors.endDate = 'End date must be on or after the start date.'
    }
    if (form.status === 'COMPLETED' && !form.endDate) {
        errors.endDate = 'A completed project needs an end date.'
    }
    return errors
}

function ManageProjects() {
    const toast = useToast()
    const confirm = useConfirm()
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('')
    const debouncedSearch = useDebouncedValue(search.trim())
    const projects = useFetch(() => projectsApi.list({ search: debouncedSearch, status }), [debouncedSearch, status])

    const dialog = useEntityDialog({
        toForm: (record) => ({
            projectName: record?.projectName || '',
            description: record?.description || '',
            startDate: record?.startDate || '',
            endDate: record?.endDate || '',
            status: record?.status || 'PLANNED',
        }),
        validate: validateProject,
        save: (form, record) => {
            const body = {
                projectName: form.projectName.trim(),
                description: form.description.trim() || null,
                startDate: form.startDate || null,
                endDate: form.endDate || null,
                status: form.status,
            }
            return record ? projectsApi.update(record.projectId, body) : projectsApi.create(body)
        },
        onSaved: (_result, record) => {
            toast.success(record ? 'Project updated.' : 'Project created.')
            projects.reload()
        },
    })

    const remove = async (project) => {
        const ok = await confirm({
            title: `Delete ${project.projectName}?`,
            message:
                project.memberCount > 0
                    ? `${pluralize(project.memberCount, 'person is', 'people are')} assigned. Their assignments will be removed too.`
                    : 'This project has no one assigned.',
            confirmText: 'Delete project',
            danger: true,
        })
        if (!ok) {
            return
        }
        try {
            await projectsApi.remove(project.projectId)
            toast.success('Project deleted.')
            projects.reload()
        } catch (error) {
            toast.error(getErrorMessage(error))
        }
    }

    const columns = [
        {
            key: 'name',
            header: 'Project',
            render: (row) => (
                <>
                    <span className="cell-primary">{row.projectName}</span>
                    {row.description ? (
                        <span className="cell-secondary" style={{ whiteSpace: 'normal', maxWidth: 420 }}>
                            {row.description}
                        </span>
                    ) : null}
                </>
            ),
        },
        { key: 'status', header: 'Status', render: (row) => <StatusLabel value={row.status} /> },
        {
            key: 'dates',
            header: 'Timeline',
            render: (row) => (
                <span className="numeric">
                    {row.startDate ? formatDate(row.startDate) : 'Not set'}
                    {row.endDate ? ` to ${formatDate(row.endDate)}` : ''}
                </span>
            ),
        },
        {
            key: 'team',
            header: 'Team',
            render: (row) => (
                <RouterLink to={`/assignments?projectId=${row.projectId}`}>{pluralize(row.memberCount, 'person', 'people')}</RouterLink>
            ),
        },
        {
            key: 'actions',
            header: <span className="visually-hidden">Actions</span>,
            align: 'right',
            render: (row) => (
                <span className="row-actions">
                    <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => dialog.open(row)} aria-label={`Edit ${row.projectName}`}>
                            <EditOutlined fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(row)} aria-label={`Delete ${row.projectName}`}>
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
                title="Projects"
                description="Work your teams are delivering. Open a team to manage who is assigned."
                actions={
                    <Button variant="contained" startIcon={<Add />} onClick={() => dialog.open()}>
                        New project
                    </Button>
                }
            />
            <div className="toolbar">
                <TextField className="grow" label="Search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
                <SelectField
                    className="filter"
                    label="Status"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    options={PROJECT_STATUSES}
                    emptyLabel="Any status"
                />
            </div>
            <DataTable
                label="Projects"
                columns={columns}
                rows={projects.data}
                rowKey={(row) => row.projectId}
                loading={projects.loading}
                error={projects.error}
                onRetry={projects.reload}
                empty={
                    search || status
                        ? { title: 'No projects match', message: 'Try a different search or status.' }
                        : {
                              title: 'No projects yet',
                              message: 'Create a project, then assign people to it.',
                              action: (
                                  <Button variant="contained" onClick={() => dialog.open()}>
                                      New project
                                  </Button>
                              ),
                          }
                }
            />

            <FormDialog
                open={dialog.isOpen}
                title={dialog.editing ? 'Edit project' : 'New project'}
                onClose={dialog.close}
                onSubmit={dialog.submit}
                submitting={dialog.saving}
                submitLabel={dialog.editing ? 'Save changes' : 'Create project'}
                error={dialog.error}
            >
                <div className="form-grid">
                    <TextField className="span-2" label="Name" autoFocus required {...dialog.field('projectName')} />
                    <TextField
                        className="span-2"
                        label="Description (optional)"
                        multiline
                        minRows={2}
                        {...dialog.field('description')}
                    />
                    <TextField label="Start date" type="date" slotProps={{ inputLabel: { shrink: true } }} {...dialog.field('startDate')} />
                    <TextField label="End date" type="date" slotProps={{ inputLabel: { shrink: true } }} {...dialog.field('endDate')} />
                    <SelectField className="span-2" label="Status" required options={PROJECT_STATUSES} {...dialog.field('status')} />
                </div>
            </FormDialog>
        </>
    )
}

export default function ProjectsPage() {
    const { isManager } = useAuth()
    return isManager ? <ManageProjects /> : <MyProjects />
}
