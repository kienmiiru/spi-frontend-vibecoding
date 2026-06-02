const BASE_URL = "http://localhost:8080";

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    Authorization: token ? `Bearer ${token}` : "",
  };

  // Only add Content-Type if it is not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

export async function apiFetchBlob(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    Authorization: token ? `Bearer ${token}` : "",
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = "Something went wrong";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch (_) {
      try {
        message = await response.text();
      } catch (__) {}
    }
    throw new Error(message);
  }

  return response.blob();
}