import type { ShortUrl } from "../api/types";

export type DisplayStatus = "active" | "disabled" | "expired";

export function displayStatus(url: Pick<ShortUrl, "status" | "expiresAt">): DisplayStatus {
  if (url.status === "DISABLED") return "disabled";
  if (url.expiresAt && new Date(url.expiresAt).getTime() < Date.now()) return "expired";
  return "active";
}

const LABEL: Record<DisplayStatus, string> = {
  active: "Active",
  disabled: "Disabled",
  expired: "Expired",
};

export function StatusLabel({ status }: { status: DisplayStatus }) {
  return <span className={`status status-${status}`}>{LABEL[status]}</span>;
}
