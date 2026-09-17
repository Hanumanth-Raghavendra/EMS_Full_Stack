import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'

import App from './App.jsx'
import store from './store'
import theme from './theme'
import { UIProvider } from './context/UIContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <UIProvider>
          <App />
        </UIProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)