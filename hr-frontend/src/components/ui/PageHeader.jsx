import Typography from '@mui/material/Typography'

export default function PageHeader({ title, description, actions }) {
    return (
        <header className="page-header">
            <div>
                <Typography variant="h1">{title}</Typography>
                {description ? <p>{description}</p> : null}
            </div>
            {actions ? <div className="page-actions">{actions}</div> : null}
        </header>
    )
}
