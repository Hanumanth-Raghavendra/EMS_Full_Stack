import { departmentsApi, designationsApi, employeesApi, projectsApi } from '../api/endpoints'
import { useFetch } from './useFetch'

/** Departments as select options. */
export function useDepartmentOptions() {
    const result = useFetch(() => departmentsApi.list(), [])
    return {
        ...result,
        options: (result.data || []).map((department) => ({
            value: department.departmentId,
            label: department.departmentName,
        })),
    }
}

/** Designations (optionally for one department) as select options. */
export function useDesignationOptions(departmentId) {
    const result = useFetch(
        () => (departmentId ? designationsApi.list(departmentId) : Promise.resolve([])),
        [departmentId]
    )
    return {
        ...result,
        options: (result.data || []).map((designation) => ({
            value: designation.designationId,
            label: designation.designationName,
        })),
    }
}

/** Employees as select options ("Ravi Kumar (EMP001)"). */
export function useEmployeeOptions({ activeOnly = true, withoutAccount = false, enabled = true } = {}) {
    const result = useFetch(
        () => (enabled ? employeesApi.options({ activeOnly, withoutAccount }) : Promise.resolve([])),
        [activeOnly, withoutAccount, enabled]
    )
    return {
        ...result,
        options: (result.data || []).map((employee) => ({
            value: employee.employeeId,
            label: `${employee.fullName} (${employee.employeeCode})`,
        })),
    }
}

export function useProjectOptions({ assignableOnly = false } = {}) {
    const result = useFetch(() => projectsApi.list(), [])
    return {
        ...result,
        options: (result.data || [])
            .filter((project) => !assignableOnly || ['PLANNED', 'ACTIVE'].includes(project.status))
            .map((project) => ({ value: project.projectId, label: project.projectName })),
    }
}
