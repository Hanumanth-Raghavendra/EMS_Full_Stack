import { useEffect, useReducer } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const initialState = {
    employees: [],
    employeeId: '',
    username: 'admin',
    password: '',
    confirmPassword: '',
    loading: true,
    creating: false,
    error: '',
    success: '',
}

function setupReducer(state, action) {
    switch (action.type) {
        case 'SET_EMPLOYEES':
            return {
                ...state,
                employees: action.payload,
            }

        case 'SET_FIELD':
            return {
                ...state,
                [action.field]: action.value,
            }

        case 'SET_LOADING':
            return {
                ...state,
                loading: action.payload,
            }

        case 'SET_CREATING':
            return {
                ...state,
                creating: action.payload,
            }

        case 'SET_ERROR':
            return {
                ...state,
                error: action.payload,
            }

        case 'SET_SUCCESS':
            return {
                ...state,
                success: action.payload,
            }

        case 'CLEAR_MESSAGES':
            return {
                ...state,
                error: '',
                success: '',
            }

        default:
            return state
    }
}

function InitialSetup() {
    const navigate = useNavigate()

    const [state, dispatch] = useReducer(
        setupReducer,
        initialState
    )

    const {
        employees,
        employeeId,
        username,
        password,
        confirmPassword,
        loading,
        creating,
        error,
        success,
    } = state

    useEffect(() => {
        checkSetup()
    }, [])

    const checkSetup = async () => {
        try {
            const statusResponse =
                await api.get('/api/setup/status')

            if (!statusResponse.data) {
                navigate('/')
                return
            }

            const employeeResponse =
                await api.get('/api/setup/employees')

            dispatch({
                type: 'SET_EMPLOYEES',
                payload: employeeResponse.data,
            })
        } catch (err) {
            console.error(err)

            dispatch({
                type: 'SET_ERROR',
                payload:
                    'Unable to load initial setup information.',
            })
        } finally {
            dispatch({
                type: 'SET_LOADING',
                payload: false,
            })
        }
    }

    const handleChange = (e) => {
        dispatch({
            type: 'SET_FIELD',
            field: e.target.name,
            value: e.target.value,
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        dispatch({
            type: 'CLEAR_MESSAGES',
        })

        if (!employeeId) {
            dispatch({
                type: 'SET_ERROR',
                payload: 'Please select an employee.',
            })
            return
        }

        if (!username.trim()) {
            dispatch({
                type: 'SET_ERROR',
                payload: 'Please enter a username.',
            })
            return
        }

        if (password.length < 6) {
            dispatch({
                type: 'SET_ERROR',
                payload:
                    'Password must contain at least 6 characters.',
            })
            return
        }

        if (password !== confirmPassword) {
            dispatch({
                type: 'SET_ERROR',
                payload: 'Passwords do not match.',
            })
            return
        }

        dispatch({
            type: 'SET_CREATING',
            payload: true,
        })

        try {
            const response = await api.post(
                '/api/setup/first-admin',
                {
                    employeeId: Number(employeeId),
                    username: username.trim(),
                    password,
                }
            )

            dispatch({
                type: 'SET_SUCCESS',
                payload:
                    response.data.message ||
                    'ADMIN account created successfully.',
            })

            setTimeout(() => {
                navigate('/')
            }, 1500)
        } catch (err) {
            console.error(err)

            if (err.response?.status === 400) {
                dispatch({
                    type: 'SET_ERROR',
                    payload:
                        err.response?.data?.message ||
                        'Invalid setup information.',
                })
            } else if (err.response?.status === 403) {
                dispatch({
                    type: 'SET_ERROR',
                    payload:
                        'Initial admin setup is no longer available.',
                })
            } else {
                dispatch({
                    type: 'SET_ERROR',
                    payload:
                        err.response?.data?.message ||
                        'Unable to create the initial ADMIN account.',
                })
            }
        } finally {
            dispatch({
                type: 'SET_CREATING',
                payload: false,
            })
        }
    }

    if (loading) {
        return (
            <div className="login-container">
                <div className="login-card">
                    <p>Checking initial setup...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Initial Setup</h1>

                <p className="subtitle">
                    Create the first administrator account.
                </p>

                {error && (
                    <p className="error">
                        {error}
                    </p>
                )}

                {success && (
                    <p className="success">
                        {success}
                    </p>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Employee</label>

                        <select
                            name="employeeId"
                            value={employeeId}
                            onChange={handleChange}
                            required
                            disabled={creating}
                        >
                            <option value="">
                                Select employee
                            </option>

                            {employees.map((employee) => (
                                <option
                                    key={employee.employeeId}
                                    value={employee.employeeId}
                                >
                                    {employee.employeeCode} -{' '}
                                    {employee.firstName}{' '}
                                    {employee.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Username</label>

                        <input
                            type="text"
                            name="username"
                            value={username}
                            onChange={handleChange}
                            minLength="3"
                            maxLength="50"
                            required
                            disabled={creating}
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>

                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={handleChange}
                            minLength="6"
                            required
                            disabled={creating}
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>

                        <input
                            type="password"
                            name="confirmPassword"
                            value={confirmPassword}
                            onChange={handleChange}
                            minLength="6"
                            required
                            disabled={creating}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={creating}
                    >
                        {creating
                            ? 'Creating ADMIN...'
                            : 'Create First ADMIN'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() => navigate('/')}
                    disabled={creating}
                    style={{
                        marginTop: '10px',
                        background: '#777',
                    }}
                >
                    Back to Login
                </button>
            </div>
        </div>
    )
}

export default InitialSetup