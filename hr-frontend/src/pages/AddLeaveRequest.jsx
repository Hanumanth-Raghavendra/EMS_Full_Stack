import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../api/axios'

export default function AddLeaveRequest() {
    const navigate = useNavigate()
    const role = useSelector((state) => state.auth.role)
    const isEmployee = role === 'EMPLOYEE'
    const employeeId = useSelector((state) => state.auth.employeeId)
    const [employees, setEmployees] = useState([])
    const [users, setUsers] = useState([])
    const [form, setForm] = useState({ employeeId: employeeId ? String(employeeId) : '', startDate: '', endDate: '', reason: '', status: 'PENDING', approvedBy: '' })
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isEmployee) {
            api.get(`/api/employees/${employeeId}`)
                .then((response) => setEmployees([response.data]))
                .catch((err) => setError(err.response?.data?.message || 'Unable to load employee profile.'))
            return
        }

        Promise.all([
            api.get('/api/employees'),
            api.get('/api/users')
        ])
            .then(([employeesResponse, usersResponse]) => {
                setEmployees(employeesResponse.data)

                setUsers(
                    usersResponse.data.filter(
                        user => user.roleName === 'ADMIN'
                    )
                )
            })
            .catch(err => setError(err.response?.status === 403 ? 'Manager/HR/Admin access is required to load approving users.' : err.response?.data?.message || 'Unable to load options.'))
    }, [isEmployee, employeeId])

    const submit = async (event) => {
        event.preventDefault(); setError('')
        if ((!isEmployee && !form.employeeId) || !form.startDate || !form.endDate || !form.reason.trim()) return setError('Employee, dates and reason are required.')
        if (form.endDate < form.startDate) return setError('End date cannot be before start date.')
        try {
            setSaving(true)
            await api.post('/api/leave-requests', {
                employeeId: Number(isEmployee ? employeeId : form.employeeId), startDate: form.startDate, endDate: form.endDate,
                reason: form.reason.trim(), status: isEmployee ? 'PENDING' : form.status,
                approvedBy: isEmployee ? null : (form.approvedBy ? Number(form.approvedBy) : null),
            })
            navigate('/leave-requests')
        } catch (err) { setError(err.response?.data?.message || 'Unable to create leave request.') }
        finally { setSaving(false) }
    }

    return <LeaveForm title="Add Leave Request" form={form} setForm={setForm} employees={employees} users={users} error={error} saving={saving} onSubmit={submit} onCancel={() => navigate('/leave-requests')} isEmployee={isEmployee} />
}

export function LeaveForm({ title, form, setForm, employees, users, error, saving, onSubmit, onCancel, isEmployee = false }) {
    return <div className="page-container"><div className="page-header"><div><h1>{title}</h1><p>Enter the leave request details.</p></div><button className="secondary-button" onClick={onCancel}>Back</button></div>{error&&<div className="error-banner">{error}</div>}<div className="form-card"><form onSubmit={onSubmit}><div className="form-grid">
        <div className="form-group"><label>Employee</label><select value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})} required disabled={isEmployee}><option value="">Select employee</option>{employees.map(e=><option key={e.employeeId} value={e.employeeId}>{e.employeeCode} — {e.firstName} {e.lastName}</option>)}</select></div>
        <div className="form-group"><label>Start Date</label><input type="date" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} required/></div>
        <div className="form-group"><label>End Date</label><input type="date" min={form.startDate||undefined} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})} required/></div>
        {!isEmployee && <div className="form-group"><label>Status</label><select value={form.status} onChange={(e) =>
            setForm({
                ...form,
                status: e.target.value,
                approvedBy:
                    e.target.value === 'APPROVED'
                        ? form.approvedBy
                        : '',
            })
        }><option>PENDING</option><option>APPROVED</option><option>REJECTED</option></select></div>}
        {!isEmployee && <div className="form-group"><label>Approved By</label><div className="form-group">
            <label>Approved By</label>

            <select
                value={form.status === 'APPROVED'
                    ? form.approvedBy
                    : ''}
                disabled={form.status !== 'APPROVED'}
                onChange={(e) =>
                    setForm({
                        ...form,
                        approvedBy: e.target.value,
                    })
                }
            >
                <option value="">
                    {form.status === 'APPROVED'
                        ? 'Select admin'
                        : 'Available after approval'}
                </option>

                {users.map((user) => (
                    <option
                        key={user.userId}
                        value={user.userId}
                    >
                        {user.username}
                    </option>
                ))}
            </select>
        </div></div>}
        <div className="form-group full"><label>Reason</label><textarea rows="5" maxLength="500" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} required/></div>
    </div><div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={saving}>{saving?'Saving...':'Save Request'}</button></div></form></div></div>
}
