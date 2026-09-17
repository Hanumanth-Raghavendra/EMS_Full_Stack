import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import EmployeeProjects from './EmployeeProjects'

const mocks = vi.hoisted(() => ({
    api: {
        get: vi.fn(),
        delete: vi.fn(),
    },
    navigate: vi.fn(),
    role: 'ADMIN',
}))

vi.mock('../api/axios', () => ({
    default: mocks.api,
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

describe('EmployeeProjects', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.role = 'ADMIN'

        mocks.api.get.mockResolvedValue({
            data: [
                {
                    employeeId: 2,
                    projectId: 1,
                    employeeName: 'Ravi Kumar',
                    projectName: 'HR Portal',
                    assignedAt: null,
                    roleInProject: null,
                },
                {
                    employeeId: 1,
                    projectId: 2,
                    employeeName: 'Anil Sharma',
                    projectName: 'Inventory System',
                    assignedAt: '2026-09-10T09:00:00',
                    roleInProject: 'Developer',
                },
                {
                    employeeId: 1,
                    projectId: 1,
                    employeeName: 'Anil Sharma',
                    projectName: 'HR Portal',
                    assignedAt: null,
                    roleInProject: 'Tester',
                },
            ],
        })
    })

    it('loads and sorts assignments by employee ID and project ID', async () => {
        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getAllByText('Anil Sharma')).toHaveLength(2)
            expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
        })

        expect(mocks.api.get).toHaveBeenCalledWith(
            '/api/employee-projects'
        )

        const rows = screen.getAllByRole('row')
        expect(rows[1]).toHaveTextContent('HR Portal')
        expect(rows[2]).toHaveTextContent('Inventory System')
        expect(rows[3]).toHaveTextContent('Ravi Kumar')
    })

    it('shows fallback values for missing assignment fields', async () => {
        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
        })

        const raviRow = screen.getByText('Ravi Kumar').closest('tr')
        expect(raviRow).toHaveTextContent('-')
    })

    it('navigates to dashboard', async () => {
        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getAllByText('Anil Sharma')).toHaveLength(2)
        })

        fireEvent.click(
            screen.getByRole('button', { name: 'Dashboard' })
        )

        expect(mocks.navigate).toHaveBeenCalledWith('/dashboard')
    })

    it('admin can navigate to assign employee page', async () => {
        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getAllByText('Anil Sharma')).toHaveLength(2)
        })

        fireEvent.click(
            screen.getByRole('button', { name: '+ Assign Employee' })
        )

        expect(mocks.navigate).toHaveBeenCalledWith(
            '/employee-projects/add'
        )
    })

    it('admin can navigate to edit assignment page', async () => {
        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getAllByText('Anil Sharma')).toHaveLength(2)
        })

        const editButtons = screen.getAllByRole('button', {
            name: 'Edit',
        })

        fireEvent.click(editButtons[0])

        expect(mocks.navigate).toHaveBeenCalledWith(
            '/employee-projects/edit/1/1'
        )
    })

    it('admin can delete an assignment after confirmation', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        mocks.api.delete.mockResolvedValue({})

        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getAllByText('Anil Sharma')).toHaveLength(2)
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        await waitFor(() => {
            expect(mocks.api.delete).toHaveBeenCalledWith(
                '/api/employee-projects/1/1'
            )
        })

        await waitFor(() => {
            const matchingRows = screen.queryAllByText('HR Portal')
            expect(matchingRows.length).toBeGreaterThan(0)
        })
    })

    it('does not delete when confirmation is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false)

        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getAllByText('Anil Sharma')).toHaveLength(2)
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        expect(mocks.api.delete).not.toHaveBeenCalled()
    })

    it('employee sees view-only assignments and no admin controls', async () => {
        mocks.role = 'EMPLOYEE'

        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getAllByText('Anil Sharma')).toHaveLength(2)
        })

        expect(
            screen.queryByRole('button', { name: '+ Assign Employee' })
        ).not.toBeInTheDocument()

        expect(
            screen.queryByRole('button', { name: 'Edit' })
        ).not.toBeInTheDocument()

        expect(
            screen.queryByRole('button', { name: 'Delete' })
        ).not.toBeInTheDocument()

        expect(screen.getAllByText('View only')).toHaveLength(3)
    })

    it('shows empty state when no assignments exist', async () => {
        mocks.api.get.mockResolvedValue({ data: [] })

        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(
                screen.getByText('No project assignments found')
            ).toBeInTheDocument()
        })
    })

    it('shows loading state initially', () => {
        mocks.api.get.mockReturnValue(new Promise(() => { }))

        render(<EmployeeProjects />)

        expect(
            screen.getByText('Loading assignments...')
        ).toBeInTheDocument()
    })

    it('shows API error when loading fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => { })

        mocks.api.get.mockRejectedValue({
            response: {
                data: {
                    message: 'Unable to fetch assignments',
                },
            },
        })

        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(
                screen.getByText('Unable to fetch assignments')
            ).toBeInTheDocument()
        })
    })

    it('shows delete error when deletion fails', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        vi.spyOn(console, 'error').mockImplementation(() => { })

        mocks.api.delete.mockRejectedValue({
            response: {
                data: {
                    message: 'Assignment deletion failed',
                },
            },
        })

        render(<EmployeeProjects />)

        await waitFor(() => {
            expect(screen.getAllByText('Anil Sharma')).toHaveLength(2)
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        await waitFor(() => {
            expect(
                screen.getByText('Assignment deletion failed')
            ).toBeInTheDocument()
        })
    })
})