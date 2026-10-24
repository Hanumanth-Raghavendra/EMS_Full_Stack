import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { Provider } from 'react-redux'
import theme from '../theme'
import { ConfirmProvider } from './ConfirmContext'
import { ToastProvider } from './ToastContext'

export default function AppProviders({ store, children }) {
    return (
        <Provider store={store}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <ToastProvider>
                    <ConfirmProvider>{children}</ConfirmProvider>
                </ToastProvider>
            </ThemeProvider>
        </Provider>
    )
}
