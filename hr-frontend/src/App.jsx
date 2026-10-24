import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import RequireAuth from './components/routing/RequireAuth'
import RequireRole from './components/routing/RequireRole'
import SessionManager from './components/SessionManager'
import Loading from './components/ui/Loading'
import { ROLES } from './utils/constants'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SetupPage = lazy(() => import('./pages/SetupPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage'))
const EmployeeFormPage = lazy(() => import('./pages/EmployeeFormPage'))
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage'))
const DesignationsPage = lazy(() => import('./pages/DesignationsPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const LeavePage = lazy(() => import('./pages/LeavePage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const AssignmentsPage = lazy(() => import('./pages/AssignmentsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const RolesPage = lazy(() => import('./pages/RolesPage'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const MANAGERS = [ROLES.ADMIN, ROLES.HR]

export function AppRoutes() {
    return (
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/setup" element={<SetupPage />} />

                <Route element={<RequireAuth />}>
                    <Route element={<AppLayout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/attendance" element={<AttendancePage />} />
                        <Route path="/leave" element={<LeavePage />} />
                        <Route path="/projects" element={<ProjectsPage />} />

                        <Route element={<RequireRole roles={MANAGERS} />}>
                            <Route path="/employees" element={<EmployeesPage />} />
                            <Route path="/employees/new" element={<EmployeeFormPage />} />
                            <Route path="/employees/:employeeId/edit" element={<EmployeeFormPage />} />
                            <Route path="/departments" element={<DepartmentsPage />} />
                            <Route path="/designations" element={<DesignationsPage />} />
                            <Route path="/assignments" element={<AssignmentsPage />} />
                            <Route path="/users" element={<UsersPage />} />
                            <Route path="/roles" element={<RolesPage />} />
                        </Route>

                        <Route element={<RequireRole roles={[ROLES.ADMIN]} />}>
                            <Route path="/audit-logs" element={<AuditLogsPage />} />
                        </Route>

                        {/* Addresses used by the previous version of the app */}
                        <Route path="/leave-requests/*" element={<Navigate to="/leave" replace />} />
                        <Route path="/employee-projects/*" element={<Navigate to="/assignments" replace />} />

                        <Route path="*" element={<NotFoundPage />} />
                    </Route>
                </Route>
            </Routes>
        </Suspense>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <SessionManager />
            <AppRoutes />
        </BrowserRouter>
    )
}
