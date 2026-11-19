
const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL =
  configuredApiBaseUrl || (import.meta.env.DEV ? "http://localhost:8080/api" : "");

if (!API_BASE_URL) {
  throw new Error("Set VITE_API_BASE_URL to the deployed backend API URL.");
}

export { API_BASE_URL };

export async function downloadFile(path, fallbackName = "learning-resource.pdf") {
  const token = localStorage.getItem("kgipToken");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: PDF download failed.`);
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
    throw new Error(
      "Cannot connect to the backend. Check the backend service and VITE_API_BASE_URL."
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

    throw new Error(
      `HTTP ${response.status}: ${message || "No response body"}`
    );
  }

  return body;
}

export function saveSession(user) {
  localStorage.setItem("kgipToken", user.token);
  localStorage.setItem("kgipUser", JSON.stringify(user));
}
