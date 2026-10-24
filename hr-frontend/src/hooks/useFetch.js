import { useCallback, useEffect, useEffectEvent, useState } from 'react'

/**
 * Loads data and re-loads whenever `deps` change.
 *
 * - keeps showing the previous data while a new request is in flight
 *   (no flashing tables when paging or filtering);
 * - ignores responses that arrive after the inputs changed;
 * - `reload()` fetches again with the same inputs.
 */
export function useFetch(fetcher, deps = []) {
    const key = JSON.stringify(deps)
    const [version, setVersion] = useState(0)
    const [state, setState] = useState({ key: null, data: undefined, error: null })

    const run = useEffectEvent(() => fetcher())

    useEffect(() => {
        let active = true
        const requestKey = `${key}#${version}`
        Promise.resolve()
            .then(() => run())
            .then(
                (data) => {
                    if (active) {
                        setState({ key: requestKey, data, error: null })
                    }
                },
                (error) => {
                    if (active) {
                        setState((previous) => ({ key: requestKey, data: previous.data, error }))
                    }
                }
            )
        return () => {
            active = false
        }
    }, [key, version])

    const reload = useCallback(() => setVersion((value) => value + 1), [])
    const mutate = useCallback(
        (updater) =>
            setState((previous) => ({
                ...previous,
                data: typeof updater === 'function' ? updater(previous.data) : updater,
            })),
        []
    )

    return {
        data: state.data,
        error: state.error,
        loading: state.key !== `${key}#${version}`,
        reload,
        mutate,
    }
}
