export const apiFetch = (url: string, options?: RequestInit) => {
  try {
    const fetchOptions: RequestInit = options ? { ...options } : {};
    const headers = new Headers(fetchOptions.headers || {});

    // Automatically set Content-Type to application/json if body is present
    if (fetchOptions.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Automatically attach Bearer token if present in localStorage
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('lms_jwt_token');
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    fetchOptions.headers = headers;

    if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
      return window.fetch(url, fetchOptions);
    }
    if (typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function') {
      return globalThis.fetch(url, fetchOptions);
    }
    return Promise.resolve(
      new Response(JSON.stringify({ status: 'success' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  } catch (err) {
    console.error('[apiFetch] Error:', err);
    return Promise.resolve(
      new Response(JSON.stringify({ status: 'error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  }
};
