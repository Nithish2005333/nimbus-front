const STORAGE_KEY = 'cloud_api_url';

export async function getApiUrl() {
  // 1. Check environment variable (Highest Priority)
  if (import.meta.env.VITE_API_URL) {
    const envUrl = import.meta.env.VITE_API_URL;
    // Keep localStorage in sync so Settings page shows correct URL
    if (localStorage.getItem(STORAGE_KEY) !== envUrl) {
      localStorage.setItem(STORAGE_KEY, envUrl);
    }
    return envUrl;
  }

  // 2. Check localStorage (Fallback if env is missing)
  const storedUrl = localStorage.getItem(STORAGE_KEY);
  if (storedUrl && storedUrl.startsWith('http')) {
    return storedUrl;
  }

  // 3. Smart Fallback (Auto-detect environment)
  // If running locally (localhost), use local backend for speed (Control Room)
  // If running on Vercel/Public, use Ngrok tunnel
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  } else {
    return 'https://deprecatory-palmar-vanna.ngrok-free.dev';
  }
}

// Set API URL manually
export async function setApiUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL');
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Remove trailing slash
  const cleanUrl = url.replace(/\/$/, '');

  // Save to localStorage
  localStorage.setItem(STORAGE_KEY, cleanUrl);
  console.log('API URL updated in localStorage:', cleanUrl);

  return cleanUrl;
}

// Clear stored URL
export async function clearApiUrl() {
  localStorage.removeItem(STORAGE_KEY);
  console.log('API URL cleared from localStorage');
}

// Get current stored URL
export function getStoredApiUrl() {
  return localStorage.getItem(STORAGE_KEY);
}

// Test API URL connectivity
export async function testApiUrl(url) {
  try {
    const testUrl = url || await getApiUrl();
    const response = await fetch(`${testUrl}/`, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const text = await response.text();
      return {
        success: true,
        message: 'API is reachable',
        status: response.status,
        response: text.substring(0, 100),
      };
    } else {
      return {
        success: false,
        message: `API returned status ${response.status}`,
        status: response.status,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to connect to API',
      error: error.name,
    };
  }
}

// Auto-detect if current URL is failing
export async function checkApiHealth() {
  const currentUrl = await getApiUrl();
  const health = await testApiUrl(currentUrl);

  if (!health.success) {
    return {
      healthy: false,
      url: currentUrl,
      message: health.message,
      suggestion: 'The API URL may have changed. Please update it in Settings.',
    };
  }

  return {
    healthy: true,
    url: currentUrl,
  };
}
