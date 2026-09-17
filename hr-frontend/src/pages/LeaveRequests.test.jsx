import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import LeaveRequests from './LeaveRequests'

const mocks = vi.hoisted(() => ({
    api: {
        get: vi.fn(),
        delete: vi.fn(),
    },
    navigate: vi.fn(),
    sortById: vi.fn((items) =>
        [...items].sort((a, b) => a.leaveId - b.leaveId)
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

describe('LeaveRequests', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.role = 'ADMIN'
        mocks.api.get.mockResolvedValue({
            data: [
                {
                    leaveId: 2,
                    employeeName: 'Ravi Kumar',
                    startDate: '2026-09-20',
                    endDate: '2026-09-22',
                    reason: 'Personal work',
                    status: 'APPROVED',
                    approvedByUsername: 'admin',
                },
                {
                    leaveId: 1,
                    employeeName: 'Anil Sharma',
                    startDate: '2026-09-15',
                    endDate: '2026-09-16',
                    reason: 'Medical leave',
                    status: 'PENDING',
                    approvedByUsername: null,
                },
            ],
        })
    })

    it('loads and displays leave requests sorted by ID', async () => {
        render(<LeaveRequests />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
            expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
        })

        expect(mocks.api.get).toHaveBeenCalledWith('/api/leave-requests')

        const rows = screen.getAllByRole('row')
        expect(rows[1]).toHaveTextContent('1')
        expect(rows[2]).toHaveTextContent('2')
    })

    it('navigates to add leave request page', async () => {
        render(<LeaveRequests />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getByRole('button', { name: '+ Add Leave Request' })
        )

        expect(mocks.navigate).toHaveBeenCalledWith('/leave-requests/add')
    })

    it('navigates to edit leave request page', async () => {
        render(<LeaveRequests />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        const editButtons = screen.getAllByRole('button', { name: 'Edit' })
        fireEvent.click(editButtons[0])

        expect(mocks.navigate).toHaveBeenCalledWith('/leave-requests/edit/1')
    })

    it('allows admin to delete a leave request after confirmation', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        mocks.api.delete.mockResolvedValue({})

        render(<LeaveRequests />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
            expect(mocks.api.delete).toHaveBeenCalledWith(
                '/api/leave-requests/1'
            )
        })

        await waitFor(() => {
            expect(screen.queryByText('Anil Sharma')).not.toBeInTheDocument()
        })
    })

    it('does not delete when confirmation is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false)

        render(<LeaveRequests />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        expect(mocks.api.delete).not.toHaveBeenCalled()
    })

    it('employee can delete only pending requests', async () => {
        mocks.role = 'EMPLOYEE'

        render(<LeaveRequests />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1)
        expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
    })

    it('shows empty state when no leave requests exist', async () => {
        mocks.api.get.mockResolvedValue({ data: [] })

        render(<LeaveRequests />)

        await waitFor(() => {
            expect(
                screen.getByText('No leave requests found')
            ).toBeInTheDocument()
        })
    })

    it('shows loading state initially', () => {
        mocks.api.get.mockReturnValue(new Promise(() => { }))

        render(<LeaveRequests />)

        expect(
            screen.getByText('Loading leave requests...')
        ).toBeInTheDocument()
    })

    it('shows API error when loading fails', async () => {
        mocks.api.get.mockRejectedValue({
            response: {
                data: {
                    message: 'Unable to fetch leave requests',
                },
            },
        })

        render(<LeaveRequests />)

        await waitFor(() => {
            expect(
                screen.getByText('Unable to fetch leave requests')
            ).toBeInTheDocument()
        })
    })

    it('shows delete error when deletion fails', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)

        mocks.api.delete.mockRejectedValue({
            response: {
                data: {
                    message: 'Delete failed',
                },
            },
        })

        render(<LeaveRequests />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        await waitFor(() => {
            expect(screen.getByText('Delete failed')).toBeInTheDocument()
        })
    })
})