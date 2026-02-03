/**
 * Testing Utilities
 * Custom render function with providers and common test helpers
 */
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { vi } from 'vitest'

// Auth context mock
const mockAuthContext = {
    user: null,
    token: null,
    isAuthenticated: false,
    login: async () => { },
    logout: () => { },
    isLoading: false,
}

interface AllProvidersProps {
    children: React.ReactNode
}

/**
 * Wrapper with all providers needed for testing
 */
const AllProviders: React.FC<AllProvidersProps> = ({ children }) => {
    return (
        <BrowserRouter>
            <I18nextProvider i18n={i18n}>
                {children}
            </I18nextProvider>
        </BrowserRouter>
    )
}

/**
 * Custom render function that wraps component with providers
 */
const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllProviders, ...options })

// Re-export everything from RTL
export * from '@testing-library/react'
export { customRender as render }

// ==================== Test Helpers ====================

/**
 * Create mock API response
 */
export const mockApiResponse = <T,>(data: T, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
})

/**
 * Mock fetch for testing API calls
 */
export const mockFetch = (responses: Record<string, unknown>) => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
        const path = new URL(url, 'http://localhost').pathname
        const response = responses[path]
        if (response) {
            return Promise.resolve(mockApiResponse(response))
        }
        return Promise.resolve(mockApiResponse({ error: 'Not found' }, 404))
    })
}

/**
 * Create test user for auth testing
 */
export const createTestUser = (overrides = {}) => ({
    id: 'user-123',
    email: 'test@medlab.cm',
    name: 'Test User',
    role: 'TECHNICIAN',
    tenantId: 'tenant-456',
    ...overrides,
})

/**
 * Wait for async operations in tests
 */
export const waitForAsync = (ms = 0) =>
    new Promise(resolve => setTimeout(resolve, ms))
