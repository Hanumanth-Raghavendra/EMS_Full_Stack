import CircularProgress from '@mui/material/CircularProgress'

export default function Loading({ label = 'Loading' }) {
    return (
        <div className="center-screen" role="status">
            <CircularProgress size={28} aria-label={label} />
        </div>
    )
}
