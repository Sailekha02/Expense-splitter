export const CURRENCIES = [
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
];

export function makeMoneyFormatter(currency = "INR") {
  const locale = currency === "INR" ? "en-IN" : undefined;
  const f = new Intl.NumberFormat(locale, { style: "currency", currency });
  return (n) => f.format(Number.isFinite(n) ? n : 0);
}

export function compactMoney(n, currency = "INR") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : undefined, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

// Expense dates are plain YYYY-MM-DD strings; parse as local time so they never shift a day.
export const parseDate = (s) => new Date(`${s}T00:00:00`);
export const formatDate = (s) =>
  parseDate(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const initials = (name = "?") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

export const memberName = (group, id) => group?.members.find((m) => m.id === id)?.name ?? "Unknown";
