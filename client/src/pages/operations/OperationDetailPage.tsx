import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import type { PlannedOperation, OperationComment, OperationHistory, KmlPoint } from "shared/types";
import { OPERATION_STATUS_LABELS_PL } from "shared/statuses";
import { UserRole } from "shared/roles";
import { StatusBadge } from "@/components/ui/status-badge";
import "leaflet/dist/leaflet.css";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return dateStr.substring(0, 10);
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pl-PL");
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-xs">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-xs text-sm text-text">{value || "—"}</dd>
    </div>
  );
}

// Leaflet map component — rendered only client-side
function RouteMap({ points }: { points: KmlPoint[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || points.length === 0) return;

    // Avoid double-initialisation
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import("leaflet").then((L) => {
      // Fix default icon path issue with bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) return;

      const latlngs: [number, number][] = points.map((p) => [p.lat, p.lng]);

      const map = L.map(mapRef.current);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
        maxZoom: 18,
      }).addTo(map);

      // Draw polyline
      const polyline = L.polyline(latlngs, { color: "#003E7E", weight: 3 }).addTo(map);

      // Add small circle markers at each point
      for (const pt of points) {
        L.circleMarker([pt.lat, pt.lng], {
          radius: 4,
          color: "#003E7E",
          fillColor: "#003E7E",
          fillOpacity: 0.8,
          weight: 1,
        }).addTo(map);
      }

      // Fit map to polyline bounds
      map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [points]);

  if (points.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-md border border-border bg-surface text-sm text-text-muted">
        Brak punktów trasy do wyświetlenia.
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="rounded-md border border-border"
      style={{ height: "400px", width: "100%" }}
    />
  );
}

export function OperationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [operation, setOperation] = useState<PlannedOperation | null>(null);
  const [comments, setComments] = useState<OperationComment[]>([]);
  const [history, setHistory] = useState<OperationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  const role = user?.role as UserRole | undefined;
  const isSupervisor = role === UserRole.SUPERVISOR || role === UserRole.SUPERADMIN;
  const isPlanner = role === UserRole.PLANNER;

  function loadOperation() {
    return fetch(`/api/operations/${id}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać operacji.");
        return res.json();
      })
      .then((data) => {
        setOperation(data.operation);
      });
  }

  function loadComments() {
    return fetch(`/api/operations/${id}/comments`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : Promise.reject(""))
      .then((data) => setComments(data.comments ?? []))
      .catch(() => {/* non-critical */});
  }

  function loadHistory() {
    return fetch(`/api/operations/${id}/history`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : Promise.reject(""))
      .then((data) => setHistory(data.history ?? []))
      .catch(() => {/* non-critical */});
  }

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([loadOperation(), loadComments(), loadHistory()])
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function doStatusTransition(toStatus: number, reason?: string) {
    setStatusActionError(null);
    setStatusActionLoading(true);
    try {
      const res = await fetch(`/api/operations/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_status: toStatus, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusActionError(data.message || "Błąd zmiany statusu.");
        toast.error(data.message || "Nie udało się zmienić statusu operacji");
        return;
      }
      toast.success("Status operacji został zmieniony");
      setOperation(data.operation);
      // Reload history to show new transition
      loadHistory();
    } catch {
      setStatusActionError("Błąd serwera.");
      toast.error("Błąd serwera");
    } finally {
      setStatusActionLoading(false);
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (commentText.trim().length > 500) {
      setCommentError("Komentarz max 500 znaków.");
      return;
    }
    setCommentError(null);
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/operations/${id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: commentText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.message || "Błąd dodawania komentarza.");
        return;
      }
      setComments((prev) => [...prev, data.comment]);
      setCommentText("");
    } catch {
      setCommentError("Błąd serwera.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  if (isLoading) return <DetailSkeleton />;
  if (error) return (
    <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">{error}</div>
  );
  if (!operation) return null;

  const kmlPoints: KmlPoint[] = Array.isArray(operation.kml_points_json)
    ? operation.kml_points_json
    : [];

  const status = operation.status;
  const canEdit =
    (isSupervisor) ||
    (isPlanner && [1, 2, 3, 4, 5].includes(status));

  const canCancel = (isPlanner || isSupervisor) && [1, 3, 4].includes(status);
  const canConfirm = isSupervisor && status === 1;
  const canReject = isSupervisor && status === 1;

  // OPS-06c linked flight orders (populated server-side)
  const flightOrders: any[] = (operation as any).flight_orders ?? [];

  return (
    <div className="max-w-3xl">
      <Link
        to="/operations"
        className="mb-lg inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Planowane operacje
      </Link>

      {/* Header */}
      <div className="mb-xl flex flex-wrap items-start justify-between gap-md">
        <div>
          <div className="flex items-center gap-md">
            <h1 className="text-heading font-semibold text-primary">
              {operation.operation_number}
            </h1>
            <StatusBadge status={status} label={OPERATION_STATUS_LABELS_PL[status as keyof typeof OPERATION_STATUS_LABELS_PL] ?? String(status)} type="operation" />
          </div>
          <p className="mt-xs text-sm text-text-muted">{operation.short_description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/operations/${id}/edit`)}
            >
              <Pencil className="mr-xs h-4 w-4" />
              Edytuj
            </Button>
          )}
          {canReject && (
            <Button
              size="sm"
              variant="outline"
              className="border-accent text-accent hover:bg-[#FFF5F5]"
              disabled={statusActionLoading}
              onClick={() => doStatusTransition(2)}
            >
              Odrzuć
            </Button>
          )}
          {canConfirm && (
            <Button
              size="sm"
              className="bg-primary text-white hover:bg-primary-hover"
              disabled={statusActionLoading}
              onClick={() => {
                if (!operation.planned_earliest_date || !operation.planned_latest_date) {
                  setStatusActionError(
                    "Przed potwierdzeniem należy uzupełnić planowane daty (najwcześniejszą i najpóźniejszą). Edytuj operację i uzupełnij daty."
                  );
                  return;
                }
                doStatusTransition(3);
              }}
            >
              Potwierdź
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="outline"
              className="border-secondary text-secondary hover:bg-surface"
              disabled={statusActionLoading}
              onClick={() => doStatusTransition(7)}
            >
              Anuluj operację
            </Button>
          )}
        </div>
      </div>

      {statusActionError && (
        <div className="mb-lg rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {statusActionError}
        </div>
      )}

      {/* Operation details */}
      <div className="mb-xl rounded-md border border-border bg-white p-lg">
        <h2 className="mb-md text-base font-semibold text-text">Szczegóły operacji</h2>
        <dl className="grid grid-cols-2 gap-md">
          <InfoRow label="Numer operacji" value={operation.operation_number} />
          <InfoRow label="Numer projektu" value={operation.project_reference} />
          <InfoRow
            label="Typy operacji"
            value={
              Array.isArray(operation.operation_types) && operation.operation_types.length > 0
                ? operation.operation_types.join(", ")
                : "—"
            }
          />
          <InfoRow label="Utworzona przez" value={operation.created_by_email} />
          <InfoRow label="Data najwcz. (prop.)" value={formatDate(operation.proposed_earliest_date)} />
          <InfoRow label="Data najpóźn. (prop.)" value={formatDate(operation.proposed_latest_date)} />
          <InfoRow label="Data najwcz. (plan.)" value={formatDate(operation.planned_earliest_date)} />
          <InfoRow label="Data najpóźn. (plan.)" value={formatDate(operation.planned_latest_date)} />
          <InfoRow
            label="Długość trasy"
            value={
              operation.route_distance_km != null
                ? `${operation.route_distance_km.toFixed(2)} km`
                : "—"
            }
          />
          <InfoRow label="Punkty trasy" value={kmlPoints.length > 0 ? `${kmlPoints.length} punktów` : "—"} />
          {operation.additional_info && (
            <div className="col-span-2 py-xs">
              <dt className="text-xs font-medium text-text-muted">Informacje dodatkowe</dt>
              <dd className="mt-xs text-sm text-text">{operation.additional_info}</dd>
            </div>
          )}
          {operation.post_completion_notes && (
            <div className="col-span-2 py-xs">
              <dt className="text-xs font-medium text-text-muted">Uwagi porealizacyjne</dt>
              <dd className="mt-xs text-sm text-text">{operation.post_completion_notes}</dd>
            </div>
          )}
          {Array.isArray(operation.contact_persons) && operation.contact_persons.length > 0 && (
            <div className="col-span-2 py-xs">
              <dt className="text-xs font-medium text-text-muted">Osoby kontaktowe</dt>
              <dd className="mt-xs text-sm text-text">{operation.contact_persons.join(", ")}</dd>
            </div>
          )}
          <InfoRow label="Utworzono" value={formatDateTime(operation.created_at)} />
          <InfoRow label="Zaktualizowano" value={formatDateTime(operation.updated_at)} />
        </dl>
      </div>

      {/* Map */}
      <div className="mb-xl">
        <h2 className="mb-md text-base font-semibold text-text">Trasa operacji</h2>
        <RouteMap points={kmlPoints} />
      </div>

      {/* Linked flight orders (OPS-06c) */}
      {flightOrders.length > 0 && (
        <div className="mb-xl rounded-md border border-border bg-white p-lg">
          <h2 className="mb-md text-base font-semibold text-text">Powiązane zlecenia na lot</h2>
          <ul className="space-y-xs">
            {flightOrders.map((fo: any) => (
              <li key={fo.id} className="flex items-center gap-md text-sm">
                <span className="font-medium text-primary">#{fo.order_number}</span>
                <span className="text-text-muted">
                  {formatDateTime(fo.planned_start_datetime)} – {formatDateTime(fo.planned_end_datetime)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Comments */}
      <div className="mb-xl rounded-md border border-border bg-white p-lg">
        <h2 className="mb-md text-base font-semibold text-text">Komentarze</h2>

        {comments.length === 0 && (
          <p className="text-sm text-text-muted">Brak komentarzy.</p>
        )}
        <ul className="mb-lg space-y-md">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md bg-surface p-sm">
              <div className="mb-xs flex items-center justify-between">
                <span className="text-xs font-medium text-primary">{c.author_name}</span>
                <span className="text-xs text-text-muted">{formatDateTime(c.created_at)}</span>
              </div>
              <p className="text-sm text-text">{c.comment_text}</p>
            </li>
          ))}
        </ul>

        <form onSubmit={submitComment}>
          <Label htmlFor="comment_text">Dodaj komentarz</Label>
          <textarea
            id="comment_text"
            className="mt-xs flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            maxLength={500}
            placeholder="Wpisz komentarz..."
          />
          <div className="mt-xs flex items-center justify-between">
            <span className="text-xs text-text-muted">{commentText.length}/500</span>
          </div>
          {commentError && <p className="mt-xs text-xs text-accent">{commentError}</p>}
          <Button
            type="submit"
            size="sm"
            className="mt-sm bg-primary text-white hover:bg-primary-hover"
            disabled={commentSubmitting || !commentText.trim()}
          >
            {commentSubmitting ? "Wysyłanie..." : "Dodaj komentarz"}
          </Button>
        </form>
      </div>

      {/* History log */}
      <div className="mb-xl rounded-md border border-border bg-white p-lg">
        <button
          type="button"
          className="flex w-full items-center justify-between text-base font-semibold text-text"
          onClick={() => setShowHistory((v) => !v)}
        >
          Historia zmian ({history.length})
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showHistory && (
          <div className="mt-md overflow-auto">
            {history.length === 0 ? (
              <p className="text-sm text-text-muted">Brak wpisów historii.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">Data</th>
                    <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">Użytkownik</th>
                    <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">Pole</th>
                    <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">Przed</th>
                    <th className="py-xs text-left text-xs font-medium text-text-muted">Po</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b border-border-subtle last:border-0">
                      <td className="py-xs pr-md text-xs text-text-muted">{formatDateTime(h.changed_at)}</td>
                      <td className="py-xs pr-md text-xs">{h.user_email}</td>
                      <td className="py-xs pr-md text-xs font-medium">{h.field_name}</td>
                      <td className="py-xs pr-md text-xs text-text-muted">{h.old_value ?? "—"}</td>
                      <td className="py-xs text-xs">{h.new_value ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Label component used inside this file
function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {children}
    </label>
  );
}
