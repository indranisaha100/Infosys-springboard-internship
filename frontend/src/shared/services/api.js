
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredApiBaseUrlWithoutTrailingSlash = configuredApiBaseUrl?.replace(/\/+$/, "");
const apiBaseUrl =
  configuredApiBaseUrlWithoutTrailingSlash ||
  (import.meta.env.DEV ? "http://localhost:8080" : "");
const API_BASE_URL = apiBaseUrl
  ? apiBaseUrl.toLowerCase().endsWith("/api")
    ? apiBaseUrl
    : `${apiBaseUrl}/api`
  : "";

if (!API_BASE_URL) {
  throw new Error("Set VITE_API_BASE_URL to the deployed backend API URL.");
}

export { API_BASE_URL };

let unauthorizedDispatched = false;

function handleUnauthorized() {
  localStorage.removeItem("kgipToken");
  localStorage.removeItem("kgipUser");

  if (!unauthorizedDispatched) {
    unauthorizedDispatched = true;
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }
}

export async function downloadFile(path, fallbackName = "learning-resource.pdf") {
  const token = localStorage.getItem("kgipToken");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    const error = new Error(`HTTP ${response.status}: PDF download failed.`);
    error.status = response.status;
    throw error;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function request(path, options = {}) {
  const token = localStorage.getItem("kgipToken");
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error("Backend connection error:", error);
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Network request failed for ${API_BASE_URL}${path}. Check the backend URL, CORS configuration, and browser network logs. Original error: ${cause}`,
      { cause: error }
    );
  }

  const responseText = await response.text();
  let body = null;

  try {
    body = responseText ? JSON.parse(responseText) : null;
  } catch {
    body = responseText;
  }

  if (!response.ok) {
    const message =
      typeof body === "string"
        ? body
        : body?.message || body?.error || JSON.stringify(body);

    console.error("API Error:", {
      url: `${API_BASE_URL}${path}`,
      status: response.status,
      response: body,
    });

    if (response.status === 401 && path.split("?")[0] !== "/auth/login") handleUnauthorized();

    const error = new Error(`HTTP ${response.status}: ${message || "No response body"}`);
    error.status = response.status;
    throw error;
  }

  return body;
}

export function saveSession(user) {
  unauthorizedDispatched = false;
  localStorage.setItem("kgipToken", user.token);
  localStorage.setItem("kgipUser", JSON.stringify(user));
}
