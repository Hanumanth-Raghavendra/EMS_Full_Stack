import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

function LoadingState({
    message = 'Loading...',
}) {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                padding: 4,
            }}
        >
            <CircularProgress
                size={24}
            />

            <span>
                {message}
            </span>
        </Box>
    )
}

export default LoadingState