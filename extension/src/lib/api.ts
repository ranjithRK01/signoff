const BASE_URL = "http://localhost:3001/api";

// Helper to get auth data from chrome storage
export async function getAuthData(): Promise<{ token: string | null; user: any }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken', 'user', 'expiresAt'], (result) => {
      if (result.authToken && result.expiresAt && result.expiresAt > Date.now()) {
        resolve({ token: result.authToken, user: result.user });
      } else {
        resolve({ token: null, user: null });
      }
    });
  });
}

// Helper to save auth data
export async function saveAuthData(token: string, user: any) {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({
      authToken: token,
      user: user,
      expiresAt: Date.now() + 86400000 // 24 hours
    }, resolve);
  });
}

// Helper to clear invalid auth
export async function clearAuthData() {
  return new Promise<void>((resolve) => {
    chrome.storage.local.remove(['authToken', 'user', 'expiresAt'], resolve);
  });
}

// Wrapped fetch to handle auth and 401s
async function authFetch(url: string, options: any = {}) {
  const { token } = await getAuthData();
  
  if (!token) {
    throw new Error('Unauthorized - No token');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    await clearAuthData();
    throw new Error('Unauthorized - Token expired');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}

export async function getProjects(token: string) {
  const res = await authFetch(`${BASE_URL}/projects`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return res.json();
}

export async function verifyAuth(token: string) {
  const res = await authFetch(`${BASE_URL}/auth/verify`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return res.json();
}

export async function createIssue(projectId: string, token: string, data: any) {
  const res = await authFetch(`${BASE_URL}/projects/${projectId}/issues`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function getIssues(projectId: string, token: string) {
  const res = await authFetch(`${BASE_URL}/projects/${projectId}/issues`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return res.json();
}
