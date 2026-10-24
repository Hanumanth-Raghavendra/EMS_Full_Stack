import { createTheme } from '@mui/material/styles'

/**
 * Design tokens. The same values are mirrored as CSS variables in index.css
 * for the parts of the UI styled with plain CSS.
 */
export const tokens = {
    ledger: '#13544E',
    ledgerDark: '#0D3B37',
    ledgerTint: '#E4EFEC',
    ink: '#17201F',
    inkSoft: '#56625F',
    paper: '#F4F6F3',
    sheet: '#FFFFFF',
    rule: '#D9DFDA',
    marigold: '#E0A526',
    marigoldTint: '#FBF1D9',
    present: '#2F7D4F',
    absent: '#B42318',
    halfDay: '#A86412',
    leave: '#4F55C9',
}

export const displayFont = '"Bricolage Grotesque", "Instrument Sans", system-ui, sans-serif'
export const bodyFont =
    '"Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const theme = createTheme({
    palette: {
        primary: { main: tokens.ledger, dark: tokens.ledgerDark, contrastText: '#FFFFFF' },
        secondary: { main: tokens.marigold, contrastText: tokens.ink },
        success: { main: tokens.present },
        error: { main: tokens.absent },
        warning: { main: tokens.halfDay },
        info: { main: tokens.leave },
        background: { default: tokens.paper, paper: tokens.sheet },
        text: { primary: tokens.ink, secondary: tokens.inkSoft },
        divider: tokens.rule,
    },
    shape: { borderRadius: 8 },
    typography: {
        fontFamily: bodyFont,
        fontSize: 14,
        h1: { fontFamily: displayFont, fontWeight: 650, fontSize: '1.9rem', letterSpacing: '-0.015em' },
        h2: { fontFamily: displayFont, fontWeight: 650, fontSize: '1.35rem', letterSpacing: '-0.01em' },
        h3: { fontFamily: displayFont, fontWeight: 600, fontSize: '1.1rem' },
        h4: { fontFamily: displayFont, fontWeight: 600, fontSize: '1rem' },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
        body2: { lineHeight: 1.5 },
    },
    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: { root: { borderRadius: 8, paddingInline: 14 } },
        },
        MuiIconButton: {
            styleOverrides: { root: { borderRadius: 8 } },
        },
        MuiTextField: {
            defaultProps: { size: 'small', fullWidth: true },
        },
        MuiFormControl: {
            defaultProps: { size: 'small' },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: { backgroundColor: tokens.sheet },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderColor: tokens.rule, paddingTop: 11, paddingBottom: 11 },
                head: {
                    fontWeight: 600,
                    color: tokens.inkSoft,
                    backgroundColor: '#F8FAF8',
                    whiteSpace: 'nowrap',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: { '&:last-of-type td': { borderBottom: 0 } },
            },
        },
        MuiDialog: {
            defaultProps: { fullWidth: true, maxWidth: 'sm' },
        },
        MuiDialogTitle: {
            styleOverrides: { root: { fontFamily: displayFont, fontWeight: 650, fontSize: '1.2rem' } },
        },
        MuiTab: {
            styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } },
        },
        MuiTabs: {
            styleOverrides: { root: { minHeight: 44 } },
        },
        MuiTooltip: {
            defaultProps: { arrow: true },
        },
        MuiAlert: {
            styleOverrides: { root: { borderRadius: 8 } },
        },
    },
})

export default theme
