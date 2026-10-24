import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useFetch } from '../hooks/useFetch'

describe('useFetch', () => {
    it('loads data and reports loading', async () => {
        const fetcher = vi.fn().mockResolvedValue(['a'])
        const { result } = renderHook(() => useFetch(fetcher, []))
        expect(result.current.loading).toBe(true)
        await waitFor(() => expect(result.current.loading).toBe(false))
        expect(result.current.data).toEqual(['a'])
    })

    it('keeps previous data and ignores stale responses when inputs change', async () => {
        let resolveFirst
        const fetcher = vi
            .fn()
            .mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
            .mockResolvedValueOnce('second')
        const { result, rerender } = renderHook(({ page }) => useFetch(() => fetcher(page), [page]), {
            initialProps: { page: 0 },
        })
        rerender({ page: 1 })
        await waitFor(() => expect(result.current.data).toBe('second'))
        await act(async () => resolveFirst('first'))
        expect(result.current.data).toBe('second')
    })

    it('exposes errors and can reload', async () => {
        const fetcher = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok')
        const { result } = renderHook(() => useFetch(fetcher, []))
        await waitFor(() => expect(result.current.error).toBeTruthy())
        act(() => result.current.reload())
        await waitFor(() => expect(result.current.data).toBe('ok'))
        expect(result.current.error).toBeNull()
    })
})
