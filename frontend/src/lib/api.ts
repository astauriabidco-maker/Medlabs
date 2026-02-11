// Use empty string to leverage Vite proxy for all /api/* requests
export const API_BASE_URL = '';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

async function request(endpoint: string, options: RequestOptions = {}) {
    const language = localStorage.getItem('i18nextLng') || 'fr';
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept-Language': language,
        ...options.headers,
    };

    // SECURITY: No need to manually set Authorization header anymore.
    // The httpOnly cookie is automatically sent by the browser.
    // However, we keep Bearer token support as a fallback for backward compatibility
    // (e.g., if the cookie is not yet set but localStorage has a token from a previous session).
    const token = localStorage.getItem('token');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
        ...options,
        headers,
        credentials: 'include', // SECURITY: Include cookies in cross-origin requests
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    return response;
}

export const api = {
    get: (endpoint: string, options?: RequestOptions) => request(endpoint, { ...options, method: 'GET' }),
    post: (endpoint: string, body: any, options?: RequestOptions) => request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint: string, body: any, options?: RequestOptions) => request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: (endpoint: string, body: any, options?: RequestOptions) => request(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: (endpoint: string, options?: RequestOptions) => request(endpoint, { ...options, method: 'DELETE' }),
};
