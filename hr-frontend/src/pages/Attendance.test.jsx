import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Attendance from './Attendance'

const mocks = vi.hoisted(() => ({
    api: {
        get: vi.fn(),
        delete: vi.fn(),
    },
    navigate: vi.fn(),
    sortById: vi.fn((items) =>
        [...items].sort((a, b) => a.attendanceId - b.attendanceId)
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

describe('Attendance', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        mocks.role = 'ADMIN'

        mocks.api.get.mockResolvedValue({
            data: [
                {
                    attendanceId: 2,
                    employeeName: 'Ravi Kumar',
                    attendanceDate: '2026-09-12',
                    status: 'ABSENT',
                    checkIn: null,
                    checkOut: null,
                },
                {
                    attendanceId: 1,
                    employeeName: 'Anil Sharma',
                    attendanceDate: '2026-09-11',
                    status: 'PRESENT',
                    checkIn: '2026-09-11T09:00:00',
                    checkOut: '2026-09-11T18:00:00',
                },
            ],
        })
    })

    it('loads and displays attendance records sorted by ID', async () => {
        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
            expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
        })

        expect(mocks.api.get).toHaveBeenCalledWith('/api/attendance')

        const rows = screen.getAllByRole('row')
        expect(rows[1]).toHaveTextContent('1')
        expect(rows[2]).toHaveTextContent('2')
    })

    it('shows formatted check-in and check-out values', async () => {
        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        const row = screen.getAllByRole('row')[1]
        expect(row).not.toHaveTextContent('—')
    })

    it('shows dash for missing check-in and check-out values', async () => {
        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Ravi Kumar')).toBeInTheDocument()
        })

        const row = screen.getAllByRole('row')[2]
        expect(row).toHaveTextContent('—')
    })

    it('admin can navigate to add attendance page', async () => {
        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getByRole('button', { name: '+ Add Attendance' })
        )

        expect(mocks.navigate).toHaveBeenCalledWith('/attendance/add')
    })

    it('admin can navigate to edit attendance page', async () => {
        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        const editButtons = screen.getAllByRole('button', { name: 'Edit' })
        fireEvent.click(editButtons[0])

        expect(mocks.navigate).toHaveBeenCalledWith('/attendance/edit/1')
    })

    it('admin can delete attendance after confirmation', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)
        mocks.api.delete.mockResolvedValue({})

        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        const deleteButtons = screen.getAllByRole('button', { name: 'Delete' })
        fireEvent.click(deleteButtons[0])

        await waitFor(() => {
            expect(mocks.api.delete).toHaveBeenCalledWith('/api/attendance/1')
        })

        await waitFor(() => {
            expect(screen.queryByText('Anil Sharma')).not.toBeInTheDocument()
        })
    })

    it('does not delete when confirmation is cancelled', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false)

        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        expect(mocks.api.delete).not.toHaveBeenCalled()
    })

    it('employee sees view-only attendance and no admin controls', async () => {
        mocks.role = 'EMPLOYEE'

        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        expect(
            screen.queryByRole('button', { name: '+ Add Attendance' })
        ).not.toBeInTheDocument()

        expect(screen.queryByRole('button', { name: 'Edit' }))
            .not.toBeInTheDocument()

        expect(screen.queryByRole('button', { name: 'Delete' }))
            .not.toBeInTheDocument()

        expect(screen.getAllByText('View only')).toHaveLength(2)
    })

    it('shows empty state when no attendance records exist', async () => {
        mocks.api.get.mockResolvedValue({ data: [] })

        render(<Attendance />)

        await waitFor(() => {
            expect(
                screen.getByText('No attendance records')
            ).toBeInTheDocument()
        })
    })

    it('shows loading state initially', () => {
        mocks.api.get.mockReturnValue(new Promise(() => { }))

        render(<Attendance />)

        expect(
            screen.getByText('Loading attendance...')
        ).toBeInTheDocument()
    })

    it('shows API error when loading fails', async () => {
        mocks.api.get.mockRejectedValue({
            response: {
                data: {
                    message: 'Unable to fetch attendance',
                },
            },
        })

        render(<Attendance />)

        await waitFor(() => {
            expect(
                screen.getByText('Unable to fetch attendance')
            ).toBeInTheDocument()
        })
    })

    it('shows delete error when deletion fails', async () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true)

        mocks.api.delete.mockRejectedValue({
            response: {
                data: {
                    message: 'Delete attendance failed',
                },
            },
        })

        render(<Attendance />)

        await waitFor(() => {
            expect(screen.getByText('Anil Sharma')).toBeInTheDocument()
        })

        fireEvent.click(
            screen.getAllByRole('button', { name: 'Delete' })[0]
        )

        await waitFor(() => {
            expect(
                screen.getByText('Delete attendance failed')
            ).toBeInTheDocument()
        })
    })
})