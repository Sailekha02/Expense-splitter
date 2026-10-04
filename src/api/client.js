const TOKEN_KEY = "es_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message, status = 0, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

async function request(method, path, body) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Make sure the backend is running (npm run dev).", 0);
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event("es:unauthorized"));
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields || {});
  }
  return data;
}

export const api = {
  register: (b) => request("POST", "/auth/register", b),
  login: (b) => request("POST", "/auth/login", b),
  me: () => request("GET", "/auth/me"),
  updateMe: (b) => request("PUT", "/auth/me", b),

  getData: () => request("GET", "/data"),

  createGroup: (b) => request("POST", "/groups", b),
  updateGroup: (id, b) => request("PUT", `/groups/${id}`, b),
  deleteGroup: (id) => request("DELETE", `/groups/${id}`),
  addMember: (id, name) => request("POST", `/groups/${id}/members`, { name }),
  removeMember: (id, memberId) => request("DELETE", `/groups/${id}/members/${memberId}`),

  createExpense: (b) => request("POST", "/expenses", b),
  updateExpense: (id, b) => request("PUT", `/expenses/${id}`, b),
  deleteExpense: (id) => request("DELETE", `/expenses/${id}`),

  createSettlement: (b) => request("POST", "/settlements", b),
  deleteSettlement: (id) => request("DELETE", `/settlements/${id}`),
};
