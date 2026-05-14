// Helper function to safely parse JSON response
// Detects HTML responses and provides helpful error messages
export async function safeJsonParse(response) {
  const contentType = response.headers.get('content-type') || '';
  
  // Read response text once
  const text = await response.text();
  
  // Check if response is HTML
  if (contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    // Try to identify the type of HTML error
    if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      // Check for common error pages
      if (text.includes('404') || text.includes('Not Found')) {
        throw new Error(`404 Not Found: The API endpoint does not exist. Check your API URL and endpoint path.`);
      }
      if (text.includes('500') || text.includes('Internal Server Error')) {
        throw new Error(`500 Server Error: The backend server encountered an error. Check server logs.`);
      }
      if (text.includes('Cannot GET') || text.includes('Cannot POST') || text.includes('Cannot PATCH') || text.includes('Cannot DELETE')) {
        throw new Error(`Method Not Allowed: The HTTP method is not supported for this endpoint.`);
      }
      if (text.includes('Render') || text.includes('sleeping') || text.includes('waking up')) {
        throw new Error(`Backend is sleeping or unavailable. If using Render, wait a moment for the server to wake up.`);
      }
      
      // Generic HTML error
      const url = response.url;
      const preview = text.substring(0, 200);
      console.error('HTML Response Preview:', preview);
      throw new Error(`Received HTML instead of JSON from ${url}. This usually means:\n1. Wrong API URL or endpoint\n2. Server is down or sleeping\n3. CORS error redirecting to error page\n4. Backend route doesn't exist\n\nCheck the Network tab for the actual response.`);
    }
  }
  
  // Try to parse as JSON
  try {
    if (!text.trim()) {
      throw new Error('Empty response from server');
    }
    return JSON.parse(text);
  } catch (parseError) {
    const url = response.url;
    // If it's a JSON parse error but we already checked for HTML, provide generic error
    throw new Error(`Failed to parse JSON response from ${url}. Response might be HTML or invalid JSON. Check the Network tab in DevTools.`);
  }
}

// Helper to check if response is likely an error page
export function isHtmlResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('text/html');
}

// Helper to get response preview for debugging
export async function getResponsePreview(response) {
  const text = await response.text();
  return text.substring(0, 500); // First 500 chars
}

