// Debug utility to test API endpoints
// Use this in browser console to debug API issues

export async function debugApi(endpoint = '/files', method = 'GET', body = null) {
  const { getApiUrl } = await import('./getApiUrl');
  const apiUrl = await getApiUrl();
  const token = localStorage.getItem('token');

  console.group('🔍 API Debug');
  console.log('URL:', `${apiUrl}${endpoint}`);
  console.log('Method:', method);
  console.log('Token:', token ? 'Present' : 'Missing');

  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = token;
  }

  try {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    console.log('Status:', response.status, response.statusText);
    console.log('Content-Type:', response.headers.get('content-type'));

    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html');

    if (isHtml) {
      const html = await response.text();
      console.error('❌ Received HTML instead of JSON!');
      console.log('HTML Preview:', html.substring(0, 500));
      console.log('Full URL:', response.url);
      
      // Try to identify error type
      if (html.includes('404') || html.includes('Not Found')) {
        console.error('🔴 This is a 404 error page - endpoint does not exist');
      } else if (html.includes('500') || html.includes('Internal Server Error')) {
        console.error('🔴 This is a 500 error page - server error');
      } else if (html.includes('Render') || html.includes('sleeping')) {
        console.error('🔴 Backend is sleeping (Render) - wait 30-60 seconds');
      } else {
        console.error('🔴 Unknown HTML error page');
      }
    } else {
      const data = await response.json();
      console.log('✅ JSON Response:', data);
    }

    return response;
  } catch (error) {
    console.error('❌ Network Error:', error);
    console.error('This usually means:');
    console.error('1. Backend server is not running');
    console.error('2. Wrong API URL');
    console.error('3. CORS issue');
    throw error;
  } finally {
    console.groupEnd();
  }
}

// Usage in browser console:
// import { debugApi } from './utils/debugApi';
// debugApi('/files', 'GET');
// debugApi('/auth/login', 'POST', { email: 'test@test.com', password: '123456' });

