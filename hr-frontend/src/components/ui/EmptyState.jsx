import Typography from '@mui/material/Typography'

export default function EmptyState({ title, message, action }) {
    return (
        <div className="empty">
            <Typography variant="h3" component="h3">
                {title}
            </Typography>
            {message ? <p>{message}</p> : null}
            {action ? <div className="empty-action">{action}</div> : null}
        </div>
    )
}
