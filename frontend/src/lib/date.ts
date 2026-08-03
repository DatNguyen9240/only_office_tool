/**
 * Date formatting utilities for standardizing date display across frontend components.
 */

export function formatDate(val?: string | Date | null): string {
  if (!val) return "—";
  try {
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) return String(val);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(val);
  }
}

export function formatRelativeDate(val?: string | Date | null): string {
  if (!val) return "—";
  try {
    const date = typeof val === "string" ? new Date(val) : val;
    if (isNaN(date.getTime())) return String(val);

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(val);
  }
}
