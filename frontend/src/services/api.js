const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  } catch {
    throw new Error(
      "Backend is unavailable. Start Spring Boot on http://localhost:8080 and try again.",
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body === "string" ? body : body?.message || "Request failed");
  }
  return body;
}

export function saveSession(user) {
  localStorage.setItem("kgipToken", user.token);
  localStorage.setItem("kgipUser", JSON.stringify(user));
}