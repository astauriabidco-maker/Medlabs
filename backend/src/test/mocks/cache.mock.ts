/**
 * Cache/Redis Mock for Unit Testing
 * Creates a mock instance of cache-manager for testing cached services
 */

export type MockCacheManager = {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    reset: jest.Mock;
    store: {
        keys: jest.Mock;
    };
};

export const createMockCacheManager = (): MockCacheManager => {
    const cache = new Map<string, any>();

    return {
        get: jest.fn((key: string) => Promise.resolve(cache.get(key))),
        set: jest.fn((key: string, value: any) => {
            cache.set(key, value);
            return Promise.resolve();
        }),
        del: jest.fn((key: string) => {
            cache.delete(key);
            return Promise.resolve();
        }),
        reset: jest.fn(() => {
            cache.clear();
            return Promise.resolve();
        }),
        store: {
            keys: jest.fn(() => Promise.resolve(Array.from(cache.keys()))),
        },
    };
};

/**
 * Helper to create a cache mock with pre-populated data
 */
export const createMockCacheManagerWithData = (
    initialData: Record<string, any>
): MockCacheManager => {
    const mock = createMockCacheManager();

    // Override get to return initial data
    mock.get.mockImplementation((key: string) =>
        Promise.resolve(initialData[key])
    );

    return mock;
};
