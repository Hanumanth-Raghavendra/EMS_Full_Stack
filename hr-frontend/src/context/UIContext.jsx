import { createContext, useContext, useState } from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    const toggleSidebar = () => {
        setSidebarCollapsed((current) => !current)
    }

    return (
        <UIContext.Provider
            value={{
                sidebarCollapsed,
                toggleSidebar,
            }}
        >
            {children}
        </UIContext.Provider>
    )
}

export function useUI() {
    const context = useContext(UIContext)

    if (!context) {
        throw new Error(
            'useUI must be used inside UIProvider'
        )
    }

    return context
}