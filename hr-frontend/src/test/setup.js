import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// MUI's useMediaQuery needs matchMedia, which jsdom does not implement.
if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes('min-width'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }))
}

beforeEach(() => {
    window.localStorage.clear()
})

afterEach(() => {
    cleanup()
})
