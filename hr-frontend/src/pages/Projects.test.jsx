import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Projects from './Projects'

const mocks = vi.hoisted(() => ({
    api: {
        get: vi.fn(),
        delete: vi.fn(),
    },
    navigate: vi.fn(),
    sortById: vi.fn((items) =>
        [...items].sort((a, b) => a.projectId - b.projectId)
    ),
    role: 'ADMIN',
}))

vi.mock('../api/axios', () => ({
    default: mocks.api,
}))

vi.mock('../utils/sortById', () => ({
    sortById: mocks.sortById,
}))

vi.mock('react-router-dom', () => ({
    useNavigate: () => mocks.navigate,
}))

vi.mock('react-redux', () => ({
    useSelector: (selector) => selector({
        auth: {
            role: mocks.role,
        },
    }),
}))

describe('Projects', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.role = 'ADMIN'

        mocks.api.get.mockResolvedValue({
            data: [
                {
                    projectId: 2,
                    projectName: 'HR Portal',
                    description: 'Human resource management',
                    startDate: '2026-02-01',
                    endDate: '2026-12-31',
                    status: 'ACTIVE',
                },
                {
                    projectId: 1,
                    projectName: 'Inventory System',
                    description: null,
                    startDate: '2026-01-01',
                    endDate: null,
                    status: 'PLANNED',
                },
            ],
        })
    })

    it('loads and displays projects sorted by ID', async () => {
        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
            expect(screen.getByText('HR Portal')).toBeInTheDocument()
        })

        expect(mocks.api.get).toHaveBeenCalledWith('/api/projects')

        const rows = screen.getAllByRole('row')
        expect(rows[1]).toHaveTextContent('1')
        expect(rows[2]).toHaveTextContent('2')
    })

    it('shows fallback dash for missing project fields', async () => {
        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        const row = screen.getAllByRole('row')[1]
        expect(row).toHaveTextContent('-')
    })

    it('navigates to dashboard', async () => {
        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        fireEvent.click(screen.getByRole('button', { name: 'Dashboard' }))

        expect(mocks.navigate).toHaveBeenCalledWith('/dashboard')
    })

    it('admin can navigate to add project page', async () => {
        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getByRole('button', { name: '+ Add Project' })
        )

        expect(mocks.navigate).toHaveBeenCalledWith('/projects/add')
    })

    it('admin can navigate to edit project page', async () => {
        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        const editButtons = screen.getAllByRole('button', { name: 'Edit' })
        fireEvent.click(editButtons[0])

        expect(mocks.navigate).toHaveBeenCalledWith('/projects/edit/1')
    })

    it('admin can delete a project after confirmation', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        mocks.api.delete.mockResolvedValue({})

        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        await waitFor(() => {
            expect(mocks.api.delete).toHaveBeenCalledWith('/api/projects/1')
        })

        await waitFor(() => {
            expect(
                screen.queryByText('Inventory System')
            ).not.toBeInTheDocument()
        })
    })

    it('does not delete when confirmation is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false)

        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        expect(mocks.api.delete).not.toHaveBeenCalled()
    })

    it('employee cannot see add project button', async () => {
        mocks.role = 'EMPLOYEE'

        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        expect(
            screen.queryByRole('button', { name: '+ Add Project' })
        ).not.toBeInTheDocument()
    })

    it('shows empty state when no projects exist', async () => {
        mocks.api.get.mockResolvedValue({ data: [] })

        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('No projects found')).toBeInTheDocument()
        })
    })

    it('shows loading state initially', () => {
        mocks.api.get.mockReturnValue(new Promise(() => { }))

        render(<Projects />)

        expect(screen.getByText('Loading projects...')).toBeInTheDocument()
    })

    it('shows API error when loading fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { })

        mocks.api.get.mockRejectedValue({
            response: {
                data: {
                    message: 'Unable to fetch projects',
                },
            },
        })

        render(<Projects />)

        await waitFor(() => {
            expect(
                screen.getByText('Unable to fetch projects')
            ).toBeInTheDocument()
        })
    })

    it('shows delete error when deletion fails', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        vi.spyOn(console, 'error').mockImplementation(() => { })

        mocks.api.delete.mockRejectedValue({
            response: {
                data: {
                    message: 'Project deletion failed',
                },
            },
        })

        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        await waitFor(() => {
            expect(
                screen.getByText('Project deletion failed')
            ).toBeInTheDocument()
        })
    })

    it('redirects to login when deletion returns 401', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        vi.spyOn(console, 'error').mockImplementation(() => { })
        const removeItem = vi.spyOn(Storage.prototype, 'removeItem')

        mocks.api.delete.mockRejectedValue({
            response: {
                status: 401,
            },
        })

        render(<Projects />)

        await waitFor(() => {
            expect(screen.getByText('Inventory System')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        await waitFor(() => {
            expect(removeItem).toHaveBeenCalledWith('jwt')
            expect(mocks.navigate).toHaveBeenCalledWith('/')
        })
    })
})