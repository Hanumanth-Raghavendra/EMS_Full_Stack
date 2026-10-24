import Typography from '@mui/material/Typography'
import { rolesApi } from '../api/endpoints'
import ErrorState from '../components/ui/ErrorState'
import Loading from '../components/ui/Loading'
import PageHeader from '../components/ui/PageHeader'
import RoleTag from '../components/ui/RoleTag'
import { useFetch } from '../hooks/useFetch'
import { pluralize } from '../utils/format'

export default function RolesPage() {
    const roles = useFetch(() => rolesApi.list(), [])

    return (
        <>
            <PageHeader
                title="Roles"
                description="The three roles are built in. Give someone a role from User accounts."
            />
            {roles.error && !roles.data ? <ErrorState error={roles.error} onRetry={roles.reload} /> : null}
            {!roles.data && !roles.error ? <Loading /> : null}
            {roles.data ? (
                <div className="sheet permission-columns">
                    {roles.data.map((role) => (
                        <div className="permission-column" key={role.roleName}>
                            <RoleTag role={role.roleName} />
                            <Typography variant="h3" component="h2" sx={{ mt: 1.5 }}>
                                {role.label}
                            </Typography>
                            <p className="muted" style={{ margin: '4px 0 0' }}>
                                {role.description}
                            </p>
                            <p style={{ margin: '10px 0 0', fontWeight: 600 }}>{pluralize(role.userCount, 'account')}</p>
                            <ul>
                                {role.permissions.map((permission) => (
                                    <li key={permission}>{permission}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : null}
        </>
    )
}
