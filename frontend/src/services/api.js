
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export async function request(path, options = {}) {
  const token = localStorage.getItem("kgipToken");
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error("Backend connection error:", error);
    throw new Error(
      "Cannot connect to backend. Check that Spring Boot is running on port 8080."
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
