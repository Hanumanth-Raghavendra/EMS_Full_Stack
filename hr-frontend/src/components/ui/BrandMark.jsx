/** The EMS mark: an attendance register page with a tick. */
export default function BrandMark({ className, size = 36 }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="#13544E" />
            <rect x="14" y="16" width="36" height="34" rx="4" fill="#F4F6F3" />
            <rect x="14" y="16" width="36" height="8" rx="4" fill="#E0A526" />
            <path
                d="M21 33l5 5 11-11"
                fill="none"
                stroke="#13544E"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
