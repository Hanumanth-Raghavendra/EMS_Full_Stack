import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { attendanceApi, employeesApi } from '../api/endpoints'
import AttendancePage from '../pages/AttendancePage'
import { USERS, page, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    attendanceApi: {
        list: vi.fn(),
        today: vi.fn(),
        checkIn: vi.fn(),
        checkOut: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
    },
    employeesApi: { options: vi.fn() },
}))

const record = {
    attendanceId: 4,
    employeeId: 3,
    employeeCode: 'EMP003',
    employeeName: 'Ravi Kumar',
    attendanceDate: '2026-06-09',
    status: 'PRESENT',
    checkIn: '2026-06-09T09:05:00',
    checkOut: '2026-06-09T18:10:00',
    workedMinutes: 545,
}

describe('AttendancePage', () => {
    beforeEach(() => {
        attendanceApi.list.mockResolvedValue(page([record]))
        attendanceApi.today.mockResolvedValue({ date: '2026-06-10', record: null, canCheckIn: true, canCheckOut: false })
        employeesApi.options.mockResolvedValue([{ employeeId: 3, employeeCode: 'EMP003', fullName: 'Ravi Kumar' }])
    })

    it('shows employees their own records without management actions', async () => {
        renderPage(<AttendancePage />, { route: '/attendance', user: USERS.EMPLOYEE })
        expect(await screen.findByText('9h 05m')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Record attendance' })).not.toBeInTheDocument()
        expect(screen.queryByRole('columnheader', { name: 'Employee' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Edit record' })).not.toBeInTheDocument()
    })

    it('checks in from the banner', async () => {
        attendanceApi.checkIn.mockResolvedValue({
            date: '2026-06-10',
            record: { ...record, attendanceDate: '2026-06-10', checkIn: '2026-06-10T09:30:00', checkOut: null },
            canCheckIn: false,
            canCheckOut: true,
        })
        renderPage(<AttendancePage />, { route: '/attendance', user: USERS.EMPLOYEE })
        await userEvent.click(await screen.findByRole('button', { name: 'Check in' }))
        expect(await screen.findByText('Checked in at 09:30.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Check out' })).toBeInTheDocument()
    })

    it('flags an inverted date range instead of requesting it', async () => {
        renderPage(<AttendancePage />, { route: '/attendance', user: USERS.HR })
        await screen.findByText('Ravi Kumar')
        const from = screen.getByLabelText('From')
        await userEvent.clear(from)
        await userEvent.type(from, '2099-01-01')
        expect(await screen.findByText('"To" must be after "From".')).toBeInTheDocument()
        expect(attendanceApi.list).not.toHaveBeenCalledWith(expect.objectContaining({ from: '2099-01-01' }))
    })

    it('validates times before recording attendance', async () => {
        attendanceApi.update.mockResolvedValue(record)
        renderPage(<AttendancePage />, { route: '/attendance', user: USERS.HR })
        await userEvent.click(await screen.findByRole('button', { name: 'Edit record' }))
        const dialog = await screen.findByRole('dialog')
        const checkIn = within(dialog).getByLabelText('Check in')
        await userEvent.clear(checkIn)
        await userEvent.type(checkIn, '19:00')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
        expect(within(dialog).getByText('Check-out must be after check-in.')).toBeInTheDocument()
        expect(attendanceApi.update).not.toHaveBeenCalled()

        await userEvent.clear(checkIn)
        await userEvent.type(checkIn, '09:15')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }))
        await waitFor(() =>
            expect(attendanceApi.update).toHaveBeenCalledWith(4, {
                employeeId: 3,
                attendanceDate: '2026-06-09',
                status: 'PRESENT',
                checkIn: '2026-06-09T09:15:00',
                checkOut: '2026-06-09T18:10:00',
            })
        )
    })
})
