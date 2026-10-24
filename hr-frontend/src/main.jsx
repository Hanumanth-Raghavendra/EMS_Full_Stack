import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AppProviders from './context/AppProviders'
import store from './store'
import './index.css'

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AppProviders store={store}>
            <App />
        </AppProviders>
    </StrictMode>
)
