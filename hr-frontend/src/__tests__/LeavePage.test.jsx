import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { employeesApi, leaveApi } from '../api/endpoints'
import LeavePage from '../pages/LeavePage'
import { USERS, page, renderPage } from '../test/render'

vi.mock('../api/endpoints', () => ({
    leaveApi: {
        list: vi.fn(),
        balance: vi.fn(),
        apply: vi.fn(),
        update: vi.fn(),
        approve: vi.fn(),
        reject: vi.fn(),
        cancel: vi.fn(),
        remove: vi.fn(),
    },
    employeesApi: { options: vi.fn() },
}))

const balances = {
    balances: [
        { leaveType: 'CASUAL', quota: 12, used: 2, pending: 0, remaining: 10 },
        { leaveType: 'SICK', quota: 10, used: 0, pending: 0, remaining: 10 },
        { leaveType: 'EARNED', quota: 15, used: 0, pending: 0, remaining: 15 },
        { leaveType: 'UNPAID', quota: null, used: 0, pending: 0, remaining: null },
    ],
}

const pending = {
    leaveId: 9,
    employeeId: 3,
    employeeCode: 'EMP003',
    employeeName: 'Ravi Kumar',
    leaveType: 'CASUAL',
    startDate: '2026-06-15',
    endDate: '2026-06-17',
    days: 3,
    reason: 'Family function',
    status: 'PENDING',
    appliedAt: '2026-06-10T10:00:00',
    permissions: { edit: false, cancel: true, review: true, delete: true },
}

describe('LeavePage', () => {
    beforeEach(() => {
        leaveApi.balance.mockResolvedValue(balances)
        leaveApi.list.mockResolvedValue(page([]))
        employeesApi.options.mockResolvedValue([])
    })

    it('shows employees their balance and no approval tabs', async () => {
        renderPage(<LeavePage />, { route: '/leave', user: USERS.EMPLOYEE })
        expect(await screen.findByText(/of 12 left/)).toBeInTheDocument()
        expect(screen.queryByRole('tab', { name: 'Waiting for approval' })).not.toBeInTheDocument()
        expect(await screen.findByText('You have not applied for leave yet')).toBeInTheDocument()
        expect(leaveApi.list).toHaveBeenCalledWith(expect.objectContaining({ mine: true }))
    })

    it('counts working days and submits a request', async () => {
        leaveApi.apply.mockResolvedValue({ leaveId: 1 })
        renderPage(<LeavePage />, { route: '/leave', user: USERS.EMPLOYEE })

        await userEvent.click((await screen.findAllByRole('button', { name: 'Apply for leave' }))[0])
        const dialog = await screen.findByRole('dialog')
        fireEvent.change(within(dialog).getByLabelText(/^from/i), { target: { value: '2026-06-15' } })
        fireEvent.change(within(dialog).getByLabelText(/^to/i), { target: { value: '2026-06-21' } })
        expect(within(dialog).getByRole('status')).toHaveTextContent('5 working days')
        fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: 'Sister’s wedding' } })
        await userEvent.click(within(dialog).getByRole('button', { name: 'Submit request' }))

        await waitFor(() =>
            expect(leaveApi.apply).toHaveBeenCalledWith({
                leaveType: 'CASUAL',
                startDate: '2026-06-15',
                endDate: '2026-06-21',
                reason: 'Sister’s wedding',
            })
        )
        expect(await screen.findByText('Leave request submitted for approval.')).toBeInTheDocument()
    })

    it('rejects weekend-only requests before sending them', async () => {
        renderPage(<LeavePage />, { route: '/leave', user: USERS.EMPLOYEE })
        await userEvent.click((await screen.findAllByRole('button', { name: 'Apply for leave' }))[0])
        const dialog = await screen.findByRole('dialog')
        fireEvent.change(within(dialog).getByLabelText(/^from/i), { target: { value: '2026-06-13' } })
        fireEvent.change(within(dialog).getByLabelText(/^to/i), { target: { value: '2026-06-14' } })
        fireEvent.change(within(dialog).getByLabelText(/reason/i), { target: { value: 'Trip' } })
        await userEvent.click(within(dialog).getByRole('button', { name: 'Submit request' }))
        expect(within(dialog).getByText('These dates contain no working days.')).toBeInTheDocument()
        expect(leaveApi.apply).not.toHaveBeenCalled()
    })

    it('lets HR approve from the approvals tab', async () => {
        leaveApi.list.mockResolvedValue(page([pending]))
        leaveApi.approve.mockResolvedValue({ ...pending, status: 'APPROVED' })
        renderPage(<LeavePage />, { route: '/leave?tab=approvals', user: USERS.HR })

        expect(await screen.findByRole('tab', { name: 'Waiting for approval', selected: true })).toBeInTheDocument()
        const row = (await screen.findByText('Ravi Kumar')).closest('tr')
        expect(within(row).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
        await userEvent.click(within(row).getByRole('button', { name: 'Approve' }))
        await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Approve' }))

        await waitFor(() => expect(leaveApi.approve).toHaveBeenCalledWith(9, null))
        expect(leaveApi.list).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING', sort: 'appliedAt,asc' }))
    })

    it('requires a reason to reject', async () => {
        leaveApi.list.mockResolvedValue(page([pending]))
        leaveApi.reject.mockResolvedValue({ ...pending, status: 'REJECTED' })
        renderPage(<LeavePage />, { route: '/leave?tab=approvals', user: USERS.HR })

        const row = (await screen.findByText('Ravi Kumar')).closest('tr')
        await userEvent.click(within(row).getByRole('button', { name: 'Reject' }))
        const dialog = await screen.findByRole('dialog')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }))
        expect(within(dialog).getByText(/give a reason/)).toBeInTheDocument()
        expect(leaveApi.reject).not.toHaveBeenCalled()

        await userEvent.type(within(dialog).getByLabelText(/reason for rejecting/i), 'Release week')
        await userEvent.click(within(dialog).getByRole('button', { name: 'Reject' }))
        await waitFor(() => expect(leaveApi.reject).toHaveBeenCalledWith(9, 'Release week'))
    })
})
