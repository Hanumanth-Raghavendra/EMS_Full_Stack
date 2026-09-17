import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    loginUser,
    clearAuthError,
} from '../store/authSlice'

function Login() {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const {
        loading: authLoading,
        error: authError,
        isAuthenticated,
    } = useSelector((state) => state.auth)

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard', {
                replace: true,
            })
        }
    }, [isAuthenticated, navigate])

    const handleSubmit = async (e) => {
        e.preventDefault()

        dispatch(clearAuthError())

        if (!username.trim()) {
            return
        }

        if (!password) {
            return
        }

        const result = await dispatch(
            loginUser({
                username: username.trim(),
                password,
            })
        )

        if (loginUser.fulfilled.match(result)) {
            navigate('/dashboard', {
                replace: true,
            })
        }
    }

    return (
        <div className="login-container">
            <div className="login-panel">
                <div className="login-brand">
                    HRMS
                </div>

                <h1>
                    HR Management System
                </h1>

                <p>
                    Sign in to manage your organization.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="login-form"
                >
                    <label>
                        Username

                        <input
                            value={username}
                            onChange={(e) =>
                                setUsername(
                                    e.target.value
                                )
                            }
                            autoComplete="username"
                            required
                            disabled={authLoading}
                        />
                    </label>

                    <label>
                        Password

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(
                                    e.target.value
                                )
                            }
                            autoComplete="current-password"
                            required
                            disabled={authLoading}
                        />
                    </label>

                    {authError && (
                        <div className="error-banner">
                            {authError}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="primary-button wide"
                        disabled={authLoading}
                    >
                        {authLoading
                            ? 'Signing in...'
                            : 'Sign in'}
                    </button>
                </form>

                <button
                    type="button"
                    onClick={() =>
                        navigate('/setup')
                    }
                    disabled={authLoading}
                    style={{
                        marginTop: '10px',
                        background: '#777',
                    }}
                >
                    Initial Setup
                </button>
            </div>
        </div>
    )
}

export default Login