import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../api/axios'

export default function EditLeaveRequest() {
    const { leaveRequestId } = useParams()
    const navigate = useNavigate()
    const role = useSelector((state) => state.auth.role)
    const isEmployee = role === 'EMPLOYEE'
    const [form, setForm] = useState(null)
    const [employees, setEmployees] = useState([])
    const [users, setUsers] = useState([])
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const leaveResponse = await api.get(`/api/leave-requests/${leaveRequestId}`)
                const r = leaveResponse.data
                setForm({
                    employeeId: r.employeeId, startDate: r.startDate || '', endDate: r.endDate || '', reason: r.reason || '', status: r.status || 'PENDING', approvedBy:
                        r.status === 'APPROVED'
                            ? (r.approvedBy || '')
                            : '' })

                if (isEmployee) {
                    const employeeResponse = await api.get(`/api/employees/${r.employeeId}`)
                    setEmployees([employeeResponse.data])
                    return
                }

                const [employeeResponse, usersResponse] =
                    await Promise.all([
                        api.get('/api/employees'),
                        api.get('/api/users'),
                    ])

                setEmployees(employeeResponse.data)

                setUsers(
                    usersResponse.data.filter(
                        user => user.roleName === 'ADMIN'
                    )
                )
            } catch (err) {
                setError(err.response?.data?.message || 'Unable to load leave request.')
            }
        }

        load()
    }, [leaveRequestId, isEmployee])

    if (!form) return <div className="page-container"><p className="loading">{error || 'Loading leave request...'}</p></div>

    const submit = async (event) => {
        event.preventDefault()
        setError('')
        if (form.endDate < form.startDate) return setError('End date cannot be before start date.')
        if (!form.reason.trim()) return setError('Reason is required.')

        try {
            setSaving(true)
            await api.put(`/api/leave-requests/${leaveRequestId}`, {
                employeeId: Number(form.employeeId),
                startDate: form.startDate,
                endDate: form.endDate,
                reason: form.reason.trim(),
                status: isEmployee ? 'PENDING' : form.status,
                approvedBy: isEmployee ? null : (form.approvedBy ? Number(form.approvedBy) : null),
            })
            navigate('/leave-requests')
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to update leave request.')
        } finally {
            setSaving(false)
        }
    }

    return <div className="page-container"><div className="page-header"><div><h1>Edit Leave Request</h1><p>{isEmployee ? 'Update your pending leave request.' : `Update leave request #${leaveRequestId}.`}</p></div><button className="secondary-button" onClick={() => navigate('/leave-requests')}>Back</button></div>{error && <div className="error-banner">{error}</div>}<div className="form-card"><form onSubmit={submit}><div className="form-grid"><div className="form-group"><label>Employee</label><select value={form.employeeId} disabled={isEmployee}>{employees.map(x => <option key={x.employeeId} value={x.employeeId}>{x.employeeCode} — {x.firstName} {x.lastName}</option>)}</select></div><div className="form-group"><label>Start Date</label><input type="date" value={form.startDate} onChange={e => setForm({...form, startDate:e.target.value})} required /></div><div className="form-group"><label>End Date</label><input type="date" min={form.startDate || undefined} value={form.endDate} onChange={e => setForm({...form, endDate:e.target.value})} required /></div>{!isEmployee && <><div className="form-group"><label>Status</label><select value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select></div><div className="form-group"><label>Approved By</label><select value={form.approvedBy} onChange={e => setForm({...form,approvedBy:e.target.value})}><option value="">Not approved</option>{users.map(x => <option key={x.userId} value={x.userId}>{x.username}</option>)}</select></div></>}<div className="form-group full"><label>Reason</label><textarea rows="5" maxLength="500" value={form.reason} onChange={e => setForm({...form,reason:e.target.value})} required /></div></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => navigate('/leave-requests')}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div></form></div></div>
}
