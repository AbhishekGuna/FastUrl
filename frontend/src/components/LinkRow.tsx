import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, updateUrl } from "../api/client";
import type { ShortUrl } from "../api/types";
import { formatDate, formatRelative } from "../lib/format";
import { isValidDestination } from "../lib/validate";
import { CopyButton } from "./CopyButton";
import { displayStatus, StatusLabel } from "./StatusLabel";
import { Icon } from "./Icon";

const SHORT_URL_BASE = import.meta.env.VITE_SHORT_URL_BASE ?? "http://localhost:3000";

export function LinkRow({
  url,
  onUpdated,
}: {
  url: ShortUrl;
  onUpdated: (url: ShortUrl) => void;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [destination, setDestination] = useState(url.destination);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const status = displayStatus(url);
  const shortUrl = `${SHORT_URL_BASE}/${url.shortCode}`;

  async function toggleStatus() {
    setPending(true);
    setError(null);
    try {
      const next = await updateUrl(url.shortCode, {
        status: url.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
      });
      onUpdated(next);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update the link.");
    } finally {
      setPending(false);
    }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!isValidDestination(destination)) {
      setError("Enter a full URL, starting with http:// or https://");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const next = await updateUrl(url.shortCode, { destination });
      onUpdated(next);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the change.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <tr>
        <td className="mono col-code">
          <a href={shortUrl} target="_blank" rel="noopener noreferrer" title="Open link in new tab">
            {url.shortCode}
          </a>
        </td>
        <td className="col-destination" title={url.destination}>
          {url.destination}
        </td>
        <td>
          <StatusLabel status={status} />
        </td>
        <td className="col-created" title={formatDate(url.createdAt)}>
          {formatRelative(url.createdAt)}
        </td>
        <td className="col-actions">
          <CopyButton value={shortUrl} label="short link" />
          <button
            type="button"
            className="row-action"
            onClick={() => navigate(`/analytics/${url.shortCode}`)}
            title="View analytics"
          >
            <Icon name="chart" />
          </button>
          <button
            type="button"
            className="row-action"
            onClick={() => {
              setEditing((v) => !v);
              setError(null);
            }}
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button type="button" className="row-action" onClick={toggleStatus} disabled={pending}>
            {url.status === "ACTIVE" ? "Disable" : "Enable"}
          </button>
        </td>
      </tr>
      {editing && (
        <tr className="edit-row">
          <td colSpan={5}>
            <form className="edit-form" onSubmit={saveEdit}>
              <label className="visually-hidden" htmlFor={`edit-${url.shortCode}`}>
                Destination for {url.shortCode}
              </label>
              <input
                id={`edit-${url.shortCode}`}
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                autoFocus
              />
              <button type="submit" className="primary-button" disabled={pending}>
                <Icon name="check" />
                Save
              </button>
            </form>
          </td>
        </tr>
      )}
      {error && (
        <tr className="edit-row">
          <td colSpan={5}>
            <p className="form-error">{error}</p>
          </td>
        </tr>
      )}

    </>
  );
}
