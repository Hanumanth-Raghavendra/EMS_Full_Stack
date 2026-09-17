import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../api/axios'
import { sortById } from '../utils/sortById'

export default function LeaveRequests() {
    const navigate = useNavigate()
    const role = useSelector((state) => state.auth.role)
    const isEmployee = role === 'EMPLOYEE'
    const [rows, setRows] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')


    useEffect(() => {
        const run = async () => {
            try {
                setLoading(true)
                const response = await api.get('/api/leave-requests')
                setRows(
                    sortById(response.data, 'leaveId')
                )
            } catch (err) {
                setError(err.response?.data?.message || 'Unable to load leave requests.')
            } finally {
                setLoading(false)
            }
        }
        run()
    }, [])

    const remove = async (leaveId) => {
        if (!window.confirm('Delete this leave request?')) return
        try {
            await api.delete(`/api/leave-requests/${leaveId}`)
            setRows(items => items.filter(item => item.leaveId !== leaveId))
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to delete leave request.')
        }
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div><h1>Leave Requests</h1><p>Manage employee leave requests and approvals.</p></div>
                <button className="primary-button" onClick={() => navigate('/leave-requests/add')}>+ Add Leave Request</button>
            </div>
            {error && <div className="error-banner">{error}</div>}
            <div className="table-card">
                {loading ? <p className="loading">Loading leave requests...</p> : rows.length === 0 ? <div className="empty-state"><h2>No leave requests found</h2></div> :
                    <div className="table-wrapper"><table><thead><tr><th>ID</th><th>Employee</th><th>Start</th><th>End</th><th>Reason</th><th>Status</th><th>Approved By</th><th>Actions</th></tr></thead><tbody>
                        {rows.map(row => <tr key={row.leaveId}><td>{row.leaveId}</td><td>{row.employeeName || row.employeeId}</td><td>{row.startDate}</td><td>{row.endDate}</td><td>{row.reason || '—'}</td><td><span className="status">{row.status}</span></td><td>{row.approvedByUsername || '—'}</td><td><div className="action-buttons"><button className="edit-button" onClick={() => navigate(`/leave-requests/edit/${row.leaveId}`)}>Edit</button>{( !isEmployee || row.status === 'PENDING') && <button className="delete-button" onClick={() => remove(row.leaveId)}>Delete</button>}</div></td></tr>)}
                    </tbody></table></div>}
            </div>
        </div>
    )
}
