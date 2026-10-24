import { useCallback, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { ToastContext } from './contexts'

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null)

    const show = useCallback((severity, message) => {
        setToast({ severity, message, key: Date.now() })
    }, [])

    const api = useMemo(
        () => ({
            success: (message) => show('success', message),
            error: (message) => show('error', message),
            info: (message) => show('info', message),
        }),
        [show]
    )

    const close = (_event, reason) => {
        if (reason !== 'clickaway') {
            setToast(null)
        }
    }

    return (
        <ToastContext.Provider value={api}>
            {children}
            <Snackbar
                key={toast?.key}
                open={Boolean(toast)}
                autoHideDuration={toast?.severity === 'error' ? 7000 : 4000}
                onClose={close}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                {toast ? (
                    <Alert onClose={close} severity={toast.severity} variant="filled" sx={{ minWidth: 300 }}>
                        {toast.message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </ToastContext.Provider>
    )
}
