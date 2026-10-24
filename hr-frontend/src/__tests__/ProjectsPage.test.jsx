import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { assignmentsApi, projectsApi } from '../api/endpoints'
import ProjectsPage from '../pages/ProjectsPage'
import { USERS, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    projectsApi: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    assignmentsApi: { list: vi.fn() },
}))

describe('ProjectsPage', () => {
    it('shows employees only their own projects', async () => {
        assignmentsApi.list.mockResolvedValue([
            {
                employeeId: 3,
                projectId: 1,
                projectName: 'Mobile App',
                projectStatus: 'ACTIVE',
                roleInProject: 'Developer',
                assignedAt: '2026-05-01T10:00:00',
            },
        ])
        renderPage(<ProjectsPage />, { route: '/projects', user: USERS.EMPLOYEE })
        expect(await screen.findByRole('heading', { name: 'My projects' })).toBeInTheDocument()
        expect(await screen.findByText('Mobile App')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'New project' })).not.toBeInTheDocument()
        expect(projectsApi.list).not.toHaveBeenCalled()
    })

    it('requires an end date for completed projects', async () => {
        projectsApi.list.mockResolvedValue([])
        projectsApi.create.mockResolvedValue({ projectId: 9 })
        renderPage(<ProjectsPage />, { route: '/projects', user: USERS.HR })

        await userEvent.click(await screen.findByRole('button', { name: 'New project' }))
        const dialog = await screen.findByRole('dialog')
        await userEvent.type(within(dialog).getByLabelText(/^name/i), 'Legacy cleanup')
        await userEvent.click(within(dialog).getByRole('combobox', { name: /status/i }))
        await userEvent.click(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Completed' }))
        await userEvent.click(within(dialog).getByRole('button', { name: 'Create project' }))
        expect(within(dialog).getByText('A completed project needs an end date.')).toBeInTheDocument()
        expect(projectsApi.create).not.toHaveBeenCalled()

        await userEvent.type(within(dialog).getByLabelText(/end date/i), '2026-05-31')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Create project' }))
        await waitFor(() =>
            expect(projectsApi.create).toHaveBeenCalledWith({
                projectName: 'Legacy cleanup',
                description: null,
                startDate: null,
                endDate: '2026-05-31',
                status: 'COMPLETED',
            })
        )
    })
})
