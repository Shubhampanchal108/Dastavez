/**
 * Centralized DMS Web/Desktop API Service
 * Handles live REST requests to FastAPI backend with JWT token injection,
 * dynamic baseURL configuration, and resilient fallback handling.
 */

const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'
    : (() => {
        throw new Error('NEXT_PUBLIC_API_BASE_URL must be configured in production.');
      })()
);
let currentBaseUrl = configuredBaseUrl;
let currentAccessToken: string | null = null;
let currentChallengeId: string | null = null;
let currentUserProfile: any = null;

// Initialize from storage if in browser
if (typeof window !== 'undefined') {
  currentAccessToken = localStorage.getItem('dms_token');
  currentBaseUrl = localStorage.getItem('dms_api_url') || configuredBaseUrl;
}

export const ApiConfig = {
  getBaseUrl: () => currentBaseUrl,
  setBaseUrl: (url: string) => {
    currentBaseUrl = url.replace(/\/+$/, '');
    if (typeof window !== 'undefined') {
      localStorage.setItem('dms_api_url', currentBaseUrl);
    }
  },
  getToken: () => currentAccessToken,
  setToken: (token: string | null) => {
    currentAccessToken = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('dms_token', token);
      else localStorage.removeItem('dms_token');
    }
  },
  getChallengeId: () => currentChallengeId,
  setChallengeId: (id: string | null) => {
    currentChallengeId = id;
  },
  getUser: () => currentUserProfile,
  setUser: (user: any) => {
    currentUserProfile = user;
    if (typeof window !== 'undefined') {
      if (user) localStorage.setItem('dms_user', JSON.stringify(user));
      else localStorage.removeItem('dms_user');
    }
  },
  clearSession: () => {
    currentAccessToken = null;
    currentUserProfile = null;
    currentChallengeId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');
    }
  },
};

function isPublicApiEndpoint(endpoint: string) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return [
    '/health',
    '/health/db',
    '/api/auth/login',
    '/api/auth/verify-otp',
    '/api/auth/mobile/reveal-otp',
  ].includes(cleanEndpoint);
}

function clearSessionAndRedirectToLogin(endpoint: string) {
  ApiConfig.clearSession();
  if (
    typeof window !== 'undefined' &&
    !isPublicApiEndpoint(endpoint) &&
    window.location.pathname !== '/login'
  ) {
    window.location.replace('/login');
  }
}

/**
 * Core fetch wrapper with timeout, JSON parsing and auth headers
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${currentBaseUrl}${cleanEndpoint}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentAccessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${currentAccessToken}`;
  }

  // Auto set Content-Type if body is JSON and not FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      if (response.status === 401) {
        clearSessionAndRedirectToLogin(endpoint);
      }
      const errorMsg =
        (data && (data.detail || data.message)) ||
        `Request failed with HTTP status ${response.status}`;
      return { data: null, error: errorMsg, status: response.status };
    }

    return { data, error: null, status: response.status };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const msg =
      err.name === 'AbortError'
        ? 'Connection timed out. Check FastAPI backend.'
        : err.message || 'Cannot reach FastAPI server';
    return { data: null, error: msg, status: 0 };
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

export const DmsApi = {
  // System Health
  async getHealth() {
    return apiRequest('/health');
  },
  async getDbHealth() {
    return apiRequest('/health/db');
  },

  // Authentication
  async login(email: string, password: string) {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.toLowerCase(), password }),
    });
    if (res.data && res.data.challenge_id) {
      ApiConfig.setChallengeId(res.data.challenge_id);
    }
    return res;
  },

  async verifyOtp(challengeId: string, otp: string) {
    const res = await apiRequest('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId, otp }),
    });
    if (res.data && res.data.access_token) {
      ApiConfig.setToken(res.data.access_token);
    }
    return res;
  },

  async getAuthenticatorChallengeStatus(challengeId: string) {
    return apiRequest(`/api/auth/authenticator-challenge/${challengeId}`);
  },

  async completeAuthenticator(challengeId: string) {
    const res = await apiRequest('/api/auth/login/complete', {
      method: 'POST',
      body: JSON.stringify({ challenge_id: challengeId }),
    });
    if (res.data && res.data.access_token) {
      ApiConfig.setToken(res.data.access_token);
    }
    return res;
  },

  async getMe() {
    const res = await apiRequest('/api/auth/me');
    if (res.data) {
      ApiConfig.setUser(res.data);
    }
    return res;
  },

  // Documents
  async listDocuments(limit: number = 50, offset: number = 0) {
    return apiRequest(`/api/documents?limit=${limit}&offset=${offset}`);
  },

  async listAuditLogs(skip: number = 0, limit: number = 100) {
    return apiRequest(`/api/audit-logs?skip=${skip}&limit=${limit}`);
  },

  async searchDocuments(params: {
    q?: string;
    case_id?: string;
    document_type?: string;
    department?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams();
    if (params.q) query.append('q', params.q);
    if (params.case_id) query.append('case_id', params.case_id);
    if (params.document_type) query.append('document_type', params.document_type);
    if (params.department) query.append('department', params.department);
    if (params.status) query.append('status', params.status);
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));

    return apiRequest(`/api/documents/search?${query.toString()}`);
  },

  async getDocument(documentId: string) {
    return apiRequest(`/api/documents/${documentId}`);
  },

  async uploadDocument(formData: FormData) {
    return apiRequest('/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
  },

  async extractText(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/extract-text`, {
      method: 'POST',
    });
  },

  async validateRequiredFields(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/validate-required-fields`, {
      method: 'POST',
    });
  },

  async validateConsistency(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/validate-consistency`, {
      method: 'POST',
    });
  },

  async getDuplicates(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/duplicates`);
  },

  async getVersions(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/versions`);
  },

  // Shares
  async listShares(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/shares`);
  },

  async createShare(documentId: string, payload: any) {
    return apiRequest(`/api/documents/${documentId}/shares`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getShare(shareId: string) {
    return apiRequest(`/api/shares/${shareId}`);
  },

  async listReceivedShares() {
    return apiRequest('/api/shares/received');
  },

  async revokeShare(shareId: string) {
    return apiRequest(`/api/shares/${shareId}/revoke`, {
      method: 'POST',
    });
  },

  async accessShare(shareId: string, accessingUserId: string) {
    return apiRequest(`/api/shares/${shareId}/access`, {
      method: 'POST',
      body: JSON.stringify({ accessing_user_id: accessingUserId }),
    });
  },

  async listUserDirectory(query?: string) {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    return apiRequest(`/api/users/directory${params}`);
  },

  // Custody
  async getCustody(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/custody`);
  },

  async transferCustody(documentId: string, payload: any) {
    return apiRequest(`/api/documents/${documentId}/custody/transfer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Blockchain
  async getBlockchainVerify(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/blockchain-verify`);
  },

  async createBlockchainProof(documentId: string) {
    return apiRequest(`/api/documents/${documentId}/blockchain-proof`, {
      method: 'POST',
    });
  },

  // Backups
  async createBackup() {
    return apiRequest('/api/backups/create', {
      method: 'POST',
    });
  },

  async restoreTest(formData: FormData) {
    return apiRequest('/api/backups/restore-test', {
      method: 'POST',
      body: formData,
    });
  },

  // AI & Validation Endpoints (Backed by PostgreSQL & Groq Qwen / Ollama)
  async getAiResult(documentId: string) {
    return apiRequest(`/api/ai/result/${documentId}`);
  },

  async classifyDocument(documentId: string) {
    return apiRequest(`/api/ai/classify/${documentId}`, {
      method: 'POST',
    });
  },

  async analyzePipeline(payload: {
    document_id?: string;
    filename?: string;
    case_id?: string;
    doc_type?: string;
    department?: string;
    text?: string;
  }) {
    return apiRequest('/api/ai/analyze-pipeline', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
