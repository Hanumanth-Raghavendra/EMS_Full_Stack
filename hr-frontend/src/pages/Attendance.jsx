import { useEffect,useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../api/axios'
import { sortById } from '../utils/sortById'

const fmt=(v)=>v?new Date(v).toLocaleString():'—'
export default function Attendance(){
 const nav=useNavigate(),role=useSelector((state)=>state.auth.role),isEmployee=role==='EMPLOYEE',[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
    useEffect(() => {
        const run = async () => {
            try {
                setLoading(true); const r = await api.get('/api/attendance'); setRows(
                    sortById(r.data, 'attendanceId')
                )
}catch(e){setError(e.response?.data?.message||'Unable to load attendance.')}finally{setLoading(false)}};run()},[])
 const del=async(id)=>{if(!window.confirm('Delete this attendance record?'))return;try{await api.delete(`/api/attendance/${id}`);setRows(x=>x.filter(r=>r.attendanceId!==id))}catch(e){setError(e.response?.data?.message||'Unable to delete attendance record.')}}
 return <div className="page-container"><div className="page-header"><div><h1>Attendance</h1><p>Track daily employee attendance.</p></div>{!isEmployee&&<button className="primary-button" onClick={()=>nav('/attendance/add')}>+ Add Attendance</button>}</div>{error&&<div className="error-banner">{error}</div>}<div className="table-card">{loading?<p className="loading">Loading attendance...</p>:rows.length===0?<div className="empty-state"><h2>No attendance records</h2></div>:<div className="table-wrapper"><table><thead><tr><th>ID</th><th>Employee</th><th>Date</th><th>Status</th><th>Check In</th><th>Check Out</th><th>Actions</th></tr></thead><tbody>{rows.map(r=><tr key={r.attendanceId}><td>{r.attendanceId}</td><td>{r.employeeName||r.employeeId}</td><td>{r.attendanceDate}</td><td><span className="status">{r.status}</span></td><td>{fmt(r.checkIn)}</td><td>{fmt(r.checkOut)}</td><td>{isEmployee?'View only':<div className="action-buttons"><button className="edit-button" onClick={()=>nav(`/attendance/edit/${r.attendanceId}`)}>Edit</button><button className="delete-button" onClick={()=>del(r.attendanceId)}>Delete</button></div>}</td></tr>)}</tbody></table></div>}</div></div>
}
