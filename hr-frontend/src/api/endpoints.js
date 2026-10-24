import api from './client'

const data = (request) => request.then((response) => response.data)

/** Drops empty values so they are not sent as query parameters. */
function clean(params = {}) {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    )
}

export const authApi = {
    login: (credentials) => data(api.post('/api/auth/login', credentials)),
    me: () => data(api.get('/api/auth/me')),
    changePassword: (body) => data(api.post('/api/auth/change-password', body)),
}

export const setupApi = {
    status: () => data(api.get('/api/setup/status')),
    createFirstAdmin: (body) => data(api.post('/api/setup/first-admin', body)),
}

export const dashboardApi = {
    summary: () => data(api.get('/api/dashboard')),
}

export const employeesApi = {
    list: (params) => data(api.get('/api/employees', { params: clean(params) })),
    get: (id) => data(api.get(`/api/employees/${id}`)),
    me: () => data(api.get('/api/employees/me')),
    options: (params) => data(api.get('/api/employees/options', { params: clean(params) })),
    create: (body) => data(api.post('/api/employees', body)),
    update: (id, body) => data(api.put(`/api/employees/${id}`, body)),
    updateMyContact: (body) => data(api.put('/api/employees/me/contact', body)),
    remove: (id) => data(api.delete(`/api/employees/${id}`)),
}

export const departmentsApi = {
    list: () => data(api.get('/api/departments')),
    create: (body) => data(api.post('/api/departments', body)),
    update: (id, body) => data(api.put(`/api/departments/${id}`, body)),
    remove: (id) => data(api.delete(`/api/departments/${id}`)),
}

export const designationsApi = {
    list: (departmentId) => data(api.get('/api/designations', { params: clean({ departmentId }) })),
    create: (body) => data(api.post('/api/designations', body)),
    update: (id, body) => data(api.put(`/api/designations/${id}`, body)),
    remove: (id) => data(api.delete(`/api/designations/${id}`)),
}

export const attendanceApi = {
    list: (params) => data(api.get('/api/attendance', { params: clean(params) })),
    today: () => data(api.get('/api/attendance/today')),
    checkIn: () => data(api.post('/api/attendance/check-in')),
    checkOut: () => data(api.post('/api/attendance/check-out')),
    create: (body) => data(api.post('/api/attendance', body)),
    update: (id, body) => data(api.put(`/api/attendance/${id}`, body)),
    remove: (id) => data(api.delete(`/api/attendance/${id}`)),
}

export const leaveApi = {
    list: (params) => data(api.get('/api/leave-requests', { params: clean(params) })),
    balance: (params) => data(api.get('/api/leave-requests/balance', { params: clean(params) })),
    apply: (body) => data(api.post('/api/leave-requests', body)),
    update: (id, body) => data(api.put(`/api/leave-requests/${id}`, body)),
    approve: (id, comment) => data(api.post(`/api/leave-requests/${id}/approve`, { comment })),
    reject: (id, comment) => data(api.post(`/api/leave-requests/${id}/reject`, { comment })),
    cancel: (id) => data(api.post(`/api/leave-requests/${id}/cancel`)),
    remove: (id) => data(api.delete(`/api/leave-requests/${id}`)),
}

export const projectsApi = {
    list: (params) => data(api.get('/api/projects', { params: clean(params) })),
    create: (body) => data(api.post('/api/projects', body)),
    update: (id, body) => data(api.put(`/api/projects/${id}`, body)),
    remove: (id) => data(api.delete(`/api/projects/${id}`)),
}

export const assignmentsApi = {
    list: (params) => data(api.get('/api/employee-projects', { params: clean(params) })),
    create: (body) => data(api.post('/api/employee-projects', body)),
    update: (employeeId, projectId, body) =>
        data(api.put(`/api/employee-projects/${employeeId}/${projectId}`, body)),
    remove: (employeeId, projectId) => data(api.delete(`/api/employee-projects/${employeeId}/${projectId}`)),
}

export const usersApi = {
    list: (search) => data(api.get('/api/users', { params: clean({ search }) })),
    create: (body) => data(api.post('/api/users', body)),
    update: (id, body) => data(api.put(`/api/users/${id}`, body)),
    resetPassword: (id, newPassword) => data(api.post(`/api/users/${id}/reset-password`, { newPassword })),
    remove: (id) => data(api.delete(`/api/users/${id}`)),
}

export const rolesApi = {
    list: () => data(api.get('/api/roles')),
}

export const auditApi = {
    list: (params) => data(api.get('/api/audit-logs', { params: clean(params) })),
    filters: () => data(api.get('/api/audit-logs/filters')),
}
