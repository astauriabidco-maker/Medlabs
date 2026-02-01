// Use empty string to leverage Vite proxy for all /api/* requests
export const API_BASE_URL = '';

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
}

async function request(endpoint: string, options: RequestOptions = {}) {
    const token = localStorage.getItem('token');
    const language = localStorage.getItem('i18nextLng') || 'fr';
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept-Language': language,
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Outgoing Request Headers:', headers);

    const config = {
        ...options,
        headers,
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
