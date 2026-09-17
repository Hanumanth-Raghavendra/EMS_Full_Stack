import { createTheme } from '@mui/material/styles'

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        error: {
            main: '#d32f2f',
        },
    },

    typography: {
        fontFamily: 'Inter, Arial, sans-serif',

        h1: {
            fontSize: '2rem',
            fontWeight: 700,
        },

        h2: {
            fontSize: '1.5rem',
            fontWeight: 600,
        },
    },

    shape: {
        borderRadius: 6,
    },

    components: {
        MuiButton: {
            defaultProps: {
                disableElevation: true,
            },
        },

        MuiTextField: {
            defaultProps: {
                variant: 'outlined',
            },
        },

        MuiChip: {
            defaultProps: {
                size: 'small',
            },
        },
    },
})

export default theme