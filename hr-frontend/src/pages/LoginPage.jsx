import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { setupApi } from '../api/endpoints'
import BrandMark from '../components/ui/BrandMark'
import DecorativeRegister from '../components/ui/DecorativeRegister'
import PasswordField from '../components/ui/PasswordField'
import RoleTag from '../components/ui/RoleTag'
import { clearAuthMessages, login, selectAuth, selectIsAuthenticated } from '../store/authSlice'

export default function LoginPage() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()
    const { status, error, signedOutReason } = useSelector(selectAuth)
    const authenticated = useSelector(selectIsAuthenticated)

    const [username, setUsername] = useState(location.state?.username || '')
    const [password, setPassword] = useState('')
    const [setup, setSetup] = useState(null)
    const [slow, setSlow] = useState(false)

    const loading = status === 'loading'

    useEffect(() => {
        let active = true
        setupApi
            .status()
            .then((result) => {
                if (active) {
                    setSetup(result)
                }
            })
            .catch(() => {
                // The sign-in form still works; the status only adds hints.
            })
        return () => {
            active = false
        }
    }, [])

    useEffect(() => {
        if (!loading) {
            return undefined
        }
        const timer = setTimeout(() => setSlow(true), 4000)
        return () => {
            clearTimeout(timer)
            setSlow(false)
        }
    }, [loading])

    if (authenticated) {
        return <Navigate to={location.state?.from || '/dashboard'} replace />
    }

    const submit = async (event) => {
        event.preventDefault()
        if (!username.trim() || !password) {
            return
        }
        const result = await dispatch(login({ username: username.trim(), password }))
        if (login.fulfilled.match(result)) {
            navigate(location.state?.from || '/dashboard', { replace: true })
        }
    }

    const fillDemoAccount = (account) => {
        dispatch(clearAuthMessages())
        setUsername(account.username)
        setPassword(account.password)
    }

    return (
        <div className="auth-page">
            <aside className="auth-aside">
                <BrandMark size={44} />
                <h1>Everyone&apos;s workday, in one register.</h1>
                <p>Check in, apply for leave, approve requests and keep employee records tidy.</p>
                <DecorativeRegister />
            </aside>

            <main className="auth-main">
                <form className="auth-form" onSubmit={submit} noValidate>
                    <Typography variant="h2" component="h2">
                        Sign in
                    </Typography>
                    <p className="muted" style={{ marginTop: 4 }}>
                        Use the username and password your HR team gave you.
                    </p>

                    <Stack spacing={2} sx={{ mt: 3 }}>
                        {setup?.setupRequired ? (
                            <Alert
                                severity="info"
                                action={
                                    <Button component={RouterLink} to="/setup" color="inherit" size="small">
                                        Set up
                                    </Button>
                                }
                            >
                                This installation has no administrator yet.
                            </Alert>
                        ) : null}
                        {signedOutReason ? <Alert severity="warning">{signedOutReason}</Alert> : null}
                        {error ? <Alert severity="error">{error}</Alert> : null}

                        <TextField
                            label="Username"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            autoComplete="username"
                            autoFocus
                            required
                            size="medium"
                            disabled={loading}
                        />
                        <PasswordField
                            label="Password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                            size="medium"
                            disabled={loading}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading || !username.trim() || !password}
                        >
                            {loading ? 'Signing in…' : 'Sign in'}
                        </Button>
                        {slow ? (
                            <p className="muted" role="status" style={{ margin: 0 }}>
                                Still working. The server may be waking up after a quiet period; this can take up to a
                                minute.
                            </p>
                        ) : null}
                    </Stack>

                    {setup?.demoMode && setup.demoAccounts?.length ? (
                        <div className="demo-accounts">
                            <p>Try a demo account</p>
                            {setup.demoAccounts.map((account) => (
                                <button
                                    type="button"
                                    key={account.username}
                                    className="demo-account"
                                    onClick={() => fillDemoAccount(account)}
                                >
                                    <span>
                                        <strong>{account.username}</strong>
                                        <span className="cell-secondary">Password {account.password}</span>
                                    </span>
                                    <RoleTag role={account.role} />
                                </button>
                            ))}
                        </div>
                    ) : null}
                </form>
            </main>
        </div>
    )
}
