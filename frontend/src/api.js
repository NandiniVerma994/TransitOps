const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed() {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  
  options.credentials = 'include';
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
  }

  let response = await fetch(url, options);

  // If 401 Unauthorized, attempt silent refresh (except for login/refresh itself)
  if (response.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/refresh') {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshResponse.ok) {
          isRefreshing = false;
          onRefreshed();
        } else {
          isRefreshing = false;
          // Clear session and redirect to login
          window.dispatchEvent(new CustomEvent('auth-session-expired'));
          throw new Error('Session expired');
        }
      } catch (err) {
        isRefreshing = false;
        window.dispatchEvent(new CustomEvent('auth-session-expired'));
        throw err;
      }
    }

    return new Promise((resolve, reject) => {
      subscribeTokenRefresh(async () => {
        try {
          const retryResponse = await fetch(url, options);
          const data = await parseResponse(retryResponse);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  return await parseResponse(response);
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = (data && data.error) || response.statusText || 'Request failed';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
