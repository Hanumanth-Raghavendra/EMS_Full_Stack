import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { getErrorMessage, getFieldErrors } from '../api/client'
import { employeesApi } from '../api/endpoints'
import ErrorState from '../components/ui/ErrorState'
import Loading from '../components/ui/Loading'
import PageHeader from '../components/ui/PageHeader'
import SelectField from '../components/ui/SelectField'
import { useToast } from '../context/contexts'
import { useFetch } from '../hooks/useFetch'
import { useDepartmentOptions, useDesignationOptions } from '../hooks/useLookups'
import { EMPLOYEE_STATUSES } from '../utils/constants'
import { toIsoDate } from '../utils/format'
import { hasErrors, validateEmployee } from '../utils/validation'

const EMPTY = {
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfJoining: '',
    departmentId: '',
    designationId: '',
    status: 'ACTIVE',
}

function toForm(employee) {
    if (!employee) {
        return EMPTY
    }
    return {
        employeeCode: employee.employeeCode || '',
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        dateOfJoining: employee.dateOfJoining || '',
        departmentId: employee.departmentId || '',
        designationId: employee.designationId || '',
        status: employee.status || 'ACTIVE',
    }
}

function EmployeeForm({ employee }) {
    const navigate = useNavigate()
    const toast = useToast()
    const editing = Boolean(employee)
    const [form, setForm] = useState(() => toForm(employee))
    const [errors, setErrors] = useState({})
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)
    const departments = useDepartmentOptions()
    const designations = useDesignationOptions(form.departmentId)
    const today = toIsoDate(new Date())

    const change = (field) => (event) => {
        const value = event.target.value
        setForm((current) => ({
            ...current,
            [field]: value,
            ...(field === 'departmentId' ? { designationId: '' } : {}),
        }))
        setErrors((current) => ({ ...current, [field]: undefined }))
    }

    const submit = async (event) => {
        event.preventDefault()
        setFormError('')
        const nextErrors = validateEmployee(form, today)
        setErrors(nextErrors)
        if (hasErrors(nextErrors)) {
            return
        }
        const body = {
            ...form,
            employeeCode: form.employeeCode.trim(),
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            departmentId: Number(form.departmentId),
            designationId: Number(form.designationId),
        }
        setSaving(true)
        try {
            const saved = editing
                ? await employeesApi.update(employee.employeeId, body)
                : await employeesApi.create(body)
            toast.success(editing ? 'Changes saved.' : `${saved.fullName} was added.`)
            navigate('/employees')
        } catch (error) {
            setErrors(getFieldErrors(error))
            setFormError(getErrorMessage(error))
        } finally {
            setSaving(false)
        }
    }

    const text = (name, label, props = {}) => (
        <TextField
            label={label}
            value={form[name]}
            onChange={change(name)}
            error={Boolean(errors[name])}
            helperText={errors[name] || props.helperText}
            required
            {...props}
        />
    )

    const noDepartments = !departments.loading && departments.options.length === 0

    return (
        <form className="sheet sheet-body" onSubmit={submit} noValidate style={{ maxWidth: 860 }}>
            {formError ? (
                <Alert severity="error" sx={{ mb: 2.5 }}>
                    {formError}
                </Alert>
            ) : null}
            {noDepartments ? (
                <Alert
                    severity="info"
                    sx={{ mb: 2.5 }}
                    action={
                        <Button component={RouterLink} to="/departments" color="inherit" size="small">
                            Add departments
                        </Button>
                    }
                >
                    Create at least one department and designation before adding employees.
                </Alert>
            ) : null}
            <div className="form-grid">
                {text('firstName', 'First name', { autoComplete: 'off', slotProps: { htmlInput: { maxLength: 50 } } })}
                {text('lastName', 'Last name', { autoComplete: 'off', slotProps: { htmlInput: { maxLength: 50 } } })}
                {text('employeeCode', 'Employee code', {
                    placeholder: 'EMP001',
                    helperText: 'Unique, letters and numbers. Saved in capitals.',
                    slotProps: { htmlInput: { maxLength: 30 } },
                })}
                {text('dateOfJoining', 'Date of joining', {
                    type: 'date',
                    slotProps: { inputLabel: { shrink: true }, htmlInput: { max: today } },
                })}
                {text('email', 'Work email', { type: 'email', slotProps: { htmlInput: { maxLength: 100 } } })}
                {text('phone', 'Mobile number', {
                    placeholder: '9876543210',
                    slotProps: { htmlInput: { inputMode: 'numeric', maxLength: 10 } },
                })}
                <SelectField
                    label="Department"
                    value={form.departmentId}
                    onChange={change('departmentId')}
                    options={departments.options}
                    error={Boolean(errors.departmentId)}
                    helperText={errors.departmentId}
                    required
                />
                <SelectField
                    label="Designation"
                    value={form.designationId}
                    onChange={change('designationId')}
                    options={designations.options}
                    error={Boolean(errors.designationId)}
                    helperText={
                        errors.designationId ||
                        (form.departmentId && !designations.loading && designations.options.length === 0
                            ? 'This department has no designations yet.'
                            : !form.departmentId
                              ? 'Choose a department first.'
                              : undefined)
                    }
                    disabled={!form.departmentId}
                    required
                />
                <SelectField
                    label="Status"
                    value={form.status}
                    onChange={change('status')}
                    options={EMPLOYEE_STATUSES}
                    error={Boolean(errors.status)}
                    helperText={errors.status || 'Inactive employees cannot sign in.'}
                    required
                />
            </div>
            <div className="form-actions">
                <Button component={RouterLink} to="/employees" color="inherit" disabled={saving}>
                    Cancel
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Add employee'}
                </Button>
            </div>
        </form>
    )
}

export default function EmployeeFormPage() {
    const { employeeId } = useParams()
    const editing = Boolean(employeeId)
    const employee = useFetch(() => (editing ? employeesApi.get(employeeId) : Promise.resolve(null)), [employeeId])

    let body
    if (editing && employee.error && !employee.data) {
        body = <ErrorState error={employee.error} onRetry={employee.reload} />
    } else if (editing && employee.loading) {
        body = <Loading />
    } else if (editing && employee.data && !employee.data.canManage) {
        body = (
            <Alert severity="warning">
                Only administrators can change the record of an HR or administrator account holder.
            </Alert>
        )
    } else {
        body = <EmployeeForm key={employeeId || 'new'} employee={editing ? employee.data : null} />
    }

    return (
        <>
            <PageHeader
                title={editing ? `Edit ${employee.data?.fullName || 'employee'}` : 'Add employee'}
                description={
                    editing
                        ? 'Update the employee record. Login details are managed under User accounts.'
                        : 'Create the employee record. You can give them a login under User accounts afterwards.'
                }
            />
            {body}
        </>
    )
}
