import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError, createUrl } from "../api/client";
import type { CreateUrlResponse } from "../api/types";
import { isValidAlias, isValidDestination } from "../lib/validate";
import { Icon } from "./Icon";

export function CreateLinkForm({ onCreated }: { onCreated: (url: CreateUrlResponse) => void }) {
  const [destination, setDestination] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidDestination(destination)) {
      setError("Enter a full URL, starting with http:// or https://");
      return;
    }
    if (alias && !isValidAlias(alias)) {
      setError("Custom alias must be 1-16 characters: letters, numbers, _ or -");
      return;
    }

    setPending(true);
    try {
      const created = await createUrl({
        destination,
        customAlias: alias || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      onCreated(created);
      setDestination("");
      setAlias("");
      setExpiresAt("");
      setExpanded(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the link. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <div className="create-form-row">
        <input
          type="text"
          className="create-form-destination"
          placeholder="https://example.com/your-long-link"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          aria-label="Destination URL"
          required
        />
        <button
          type="button"
          className="ghost-button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <Icon name="chevron" className={expanded ? "chevron-open" : undefined} />
          Options
        </button>
        <button type="submit" className="primary-button" disabled={pending}>
          <Icon name="plus" />
          {pending ? "Adding…" : "Add link"}
        </button>
      </div>

      {expanded && (
        <div className="create-form-options">
          <label>
            Custom alias
            <input
              type="text"
              className="mono"
              placeholder="optional"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={16}
            />
          </label>
          <label>
            Expires
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </label>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
