import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Employees from './pages/Employees'
import AddEmployee from './pages/AddEmployee'
import EditEmployee from './pages/EditEmployee'
import Departments from './pages/Departments'
import Designations from './pages/Designations'
import Attendance from './pages/Attendance'
import AddAttendance from './pages/AddAttendance'
import EditAttendance from './pages/EditAttendance'
import LeaveRequests from './pages/LeaveRequests'
import AddLeaveRequest from './pages/AddLeaveRequest'
import EditLeaveRequest from './pages/EditLeaveRequest'
import Projects from './pages/Projects'
import AddProject from './pages/AddProject'
import EditProject from './pages/EditProject'
import EmployeeProjects from './pages/EmployeeProjects'
import AddEmployeeProject from './pages/AddEmployeeProject'
import EditEmployeeProject from './pages/EditEmployeeProject'
import Users from './pages/Users'
import AddUser from './pages/AddUser'
import EditUser from './pages/EditUser'
import Roles from './pages/Roles'
import AuditLogs from './pages/AuditLogs'
import InitialSetup from './pages/InitialSetup'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { logout } from './store/authSlice'
import './App.css'

export default function App() {
    const dispatch = useDispatch()

    useEffect(() => {
        const handleAuthLogout = () => {
            dispatch(logout())
        }

        window.addEventListener(
            'auth:logout',
            handleAuthLogout
        )

        return () => {
            window.removeEventListener(
                'auth:logout',
                handleAuthLogout
            )
        }
    }, [dispatch])
    return <BrowserRouter><Routes><Route
        path="/setup"
        element={<InitialSetup />}
    /><Route path="/" element={<Login/>}/><Route element={<ProtectedRoute/>}><Route element={<Layout/>}><Route path="/dashboard" element={<Dashboard/>}/><Route path="/employees" element={<Employees/>}/><Route path="/employees/add" element={<AddEmployee/>}/><Route path="/employees/edit/:employeeId" element={<EditEmployee/>}/><Route path="/departments" element={<Departments/>}/><Route path="/designations" element={<Designations/>}/><Route path="/attendance" element={<Attendance/>}/><Route path="/attendance/add" element={<AddAttendance/>}/><Route path="/attendance/edit/:attendanceId" element={<EditAttendance/>}/><Route path="/leave-requests" element={<LeaveRequests/>}/><Route path="/leave-requests/add" element={<AddLeaveRequest/>}/><Route path="/leave-requests/edit/:leaveRequestId" element={<EditLeaveRequest/>}/><Route path="/projects" element={<Projects/>}/><Route path="/projects/add" element={<AddProject/>}/><Route path="/projects/edit/:projectId" element={<EditProject/>}/><Route path="/employee-projects" element={<EmployeeProjects/>}/><Route path="/employee-projects/add" element={<AddEmployeeProject/>}/><Route path="/employee-projects/edit/:employeeId/:projectId" element={<EditEmployeeProject/>}/><Route path="/users" element={<Users/>}/><Route path="/users/add" element={<AddUser/>}/><Route path="/users/edit/:userId" element={<EditUser/>}/><Route path="/roles" element={<Roles/>}/><Route path="/audit-logs" element={<AuditLogs/>}/></Route></Route><Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes></BrowserRouter>}
