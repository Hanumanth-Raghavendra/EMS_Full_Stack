import { useState } from 'react'
import { getErrorMessage, getFieldErrors } from '../api/client'

/**
 * State for a create/edit dialog: which record is open, the form values,
 * field errors and the save handler.
 */
export function useEntityDialog({ toForm, validate, save, onSaved }) {
    const [target, setTarget] = useState(null) // { record } or null
    const [form, setForm] = useState({})
    const [errors, setErrors] = useState({})
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)

    const open = (record = null) => {
        setTarget({ record })
        setForm(toForm(record))
        setErrors({})
        setError('')
    }

    const close = () => {
        if (!saving) {
            setTarget(null)
        }
    }

    const field = (name) => ({
        value: form[name] ?? '',
        onChange: (event) => {
            const value = event?.target ? event.target.value : event
            setForm((current) => ({ ...current, [name]: value }))
            setErrors((current) => ({ ...current, [name]: undefined }))
        },
        error: Boolean(errors[name]),
        helperText: errors[name],
    })

    const submit = async () => {
        const nextErrors = validate ? validate(form, target?.record) : {}
        setErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) {
            return
        }
        setSaving(true)
        setError('')
        try {
            const result = await save(form, target?.record)
            setTarget(null)
            onSaved?.(result, target?.record)
        } catch (err) {
            setErrors(getFieldErrors(err))
            setError(getErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return {
        isOpen: Boolean(target),
        record: target?.record ?? null,
        editing: Boolean(target?.record),
        form,
        setForm,
        errors,
        error,
        saving,
        open,
        close,
        field,
        submit,
    }
}
