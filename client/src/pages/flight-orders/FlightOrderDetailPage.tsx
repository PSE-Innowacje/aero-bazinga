import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import type { FlightOrder, KmlPoint } from "shared/types";
import { FLIGHT_ORDER_STATUS_LABELS_PL } from "shared/statuses";
import { UserRole } from "shared/roles";
import "leaflet/dist/leaflet.css";

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pl-PL");
}

function StatusBadge({ status }: { status: number }) {
  const label =
    FLIGHT_ORDER_STATUS_LABELS_PL[
      status as keyof typeof FLIGHT_ORDER_STATUS_LABELS_PL
    ] ?? String(status);
  const colorMap: Record<number, string> = {
    1: "bg-blue-100 text-blue-800",
    2: "bg-yellow-100 text-yellow-800",
    3: "bg-red-100 text-red-800",
    4: "bg-green-100 text-green-800",
    5: "bg-orange-100 text-orange-800",
    6: "bg-gray-100 text-gray-800",
    7: "bg-slate-100 text-slate-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${colorMap[status] ?? "bg-gray-100 text-gray-800"}`}
    >
      {label}
    </span>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="py-xs">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-xs text-sm text-text">{value || "—"}</dd>
    </div>
  );
}

// Map component showing start airfield, operation routes, end airfield
function FlightOrderMap({
  startAirfield,
  endAirfield,
  operations,
}: {
  startAirfield: { name: string; lat: number; lng: number } | null;
  endAirfield: { name: string; lat: number; lng: number } | null;
  operations: Array<{
    operation_number: string;
    kml_points_json: KmlPoint[] | null;
  }>;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    import("leaflet").then((L) => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) return;

      const map = L.map(mapRef.current);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      // Start airfield marker (green)
      if (startAirfield) {
        const startIcon = L.divIcon({
          className: "",
          html: `<div style="background:#16a34a;border:2px solid #fff;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([startAirfield.lat, startAirfield.lng], { icon: startIcon })
          .addTo(map)
          .bindPopup(`Start: ${startAirfield.name}`);
        bounds.push([startAirfield.lat, startAirfield.lng]);
      }

      // Operation routes
      const colors = [
        "#003E7E",
        "#D20A11",
        "#2563eb",
        "#9333ea",
        "#ea580c",
      ];
      operations.forEach((op, idx) => {
        const points = op.kml_points_json;
        if (!points || points.length === 0) return;
        const latlngs: [number, number][] = points.map((p) => [p.lat, p.lng]);
        const color = colors[idx % colors.length];

        L.polyline(latlngs, { color, weight: 3 }).addTo(map);
        for (const pt of points) {
          L.circleMarker([pt.lat, pt.lng], {
            radius: 3,
            color,
            fillColor: color,
            fillOpacity: 0.8,
            weight: 1,
          }).addTo(map);
          bounds.push([pt.lat, pt.lng]);
        }
      });

      // End airfield marker (red)
      if (endAirfield) {
        const endIcon = L.divIcon({
          className: "",
          html: `<div style="background:#D20A11;border:2px solid #fff;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([endAirfield.lat, endAirfield.lng], { icon: endIcon })
          .addTo(map)
          .bindPopup(`Lądowanie: ${endAirfield.name}`);
        bounds.push([endAirfield.lat, endAirfield.lng]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
        // Default to Poland center
        map.setView([52.0, 19.0], 6);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [startAirfield, endAirfield, operations]);

  return (
    <div
      ref={mapRef}
      className="rounded-md border border-border"
      style={{ height: "400px", width: "100%" }}
    />
  );
}

export function FlightOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<FlightOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(
    null
  );
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  // Completion dialog state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionType, setCompletionType] = useState<5 | 6 | 7 | null>(null);
  const [actualStart, setActualStart] = useState("");
  const [actualEnd, setActualEnd] = useState("");
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Airfield coords for map
  const [startAirfield, setStartAirfield] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [endAirfield, setEndAirfield] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  const role = user?.role as UserRole | undefined;
  const isPilot = role === UserRole.PILOT || role === UserRole.SUPERADMIN;
  const isSupervisor = role === UserRole.SUPERVISOR || role === UserRole.SUPERADMIN;

  function loadOrder() {
    return fetch(`/api/flight-orders/${id}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się pobrać zlecenia.");
        return res.json();
      })
      .then((data) => {
        setOrder(data.order);
        return data.order;
      });
  }

  // Load airfield coordinates from flight-orders scoped endpoint
  async function loadAirfields(ord: FlightOrder) {
    try {
      const res = await fetch("/api/flight-orders/airfields/list", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const airfields: Array<{ id: number; name: string; latitude: number; longitude: number }> =
          data.airfields ?? [];
        const start = airfields.find((a) => a.id === ord.start_airfield_id);
        if (start)
          setStartAirfield({
            name: start.name,
            lat: start.latitude,
            lng: start.longitude,
          });
        const end = airfields.find((a) => a.id === ord.end_airfield_id);
        if (end)
          setEndAirfield({
            name: end.name,
            lat: end.latitude,
            lng: end.longitude,
          });
      }
    } catch {
      /* non-critical */
    }
  }

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    loadOrder()
      .then((ord) => {
        if (ord) loadAirfields(ord);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function doStatusTransition(
    toStatus: number,
    extras?: Record<string, any>
  ) {
    setStatusActionError(null);
    setStatusActionLoading(true);
    try {
      const res = await fetch(`/api/flight-orders/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_status: toStatus, ...extras }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusActionError(data.message || "Błąd zmiany statusu.");
        return;
      }
      setOrder(data.order);
      setShowCompletionDialog(false);
    } catch {
      setStatusActionError("Błąd serwera.");
    } finally {
      setStatusActionLoading(false);
    }
  }

  function handleCompletion(type: 5 | 6 | 7) {
    if (type === 7) {
      // "Nie zrealizowane" - no datetime needed
      doStatusTransition(7);
    } else {
      // Need actual datetime
      setCompletionType(type);
      setActualStart(order?.actual_start_datetime ? new Date(order.actual_start_datetime).toISOString().slice(0, 16) : "");
      setActualEnd(order?.actual_end_datetime ? new Date(order.actual_end_datetime).toISOString().slice(0, 16) : "");
      setCompletionError(null);
      setShowCompletionDialog(true);
    }
  }

  function submitCompletion() {
    if (!actualStart || !actualEnd) {
      setCompletionError(
        "Rzeczywista data rozpoczęcia i zakończenia są wymagane."
      );
      return;
    }
    if (completionType === null) return;
    doStatusTransition(completionType, {
      actual_start_datetime: new Date(actualStart).toISOString(),
      actual_end_datetime: new Date(actualEnd).toISOString(),
    });
  }

  if (isLoading)
    return <p className="text-body text-text-muted">Ładowanie...</p>;
  if (error)
    return (
      <div className="rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
        {error}
      </div>
    );
  if (!order) return null;

  const status = order.status;
  const canEdit =
    (isPilot && [1, 3].includes(status)) ||
    (isSupervisor && [1, 2, 3, 4].includes(status));
  const canSubmit = isPilot && status === 1;
  const canAccept = isSupervisor && status === 2;
  const canReject = isSupervisor && status === 2;
  const canComplete = isPilot && status === 4;

  return (
    <div className="max-w-3xl">
      <Link
        to="/flight-orders"
        className="mb-lg inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        Zlecenia na lot
      </Link>

      {/* Header */}
      <div className="mb-xl flex flex-wrap items-start justify-between gap-md">
        <div>
          <div className="flex items-center gap-md">
            <h1 className="text-heading font-semibold text-primary">
              Zlecenie {order.order_number}
            </h1>
            <StatusBadge status={status} />
          </div>
          <p className="mt-xs text-sm text-text-muted">
            {order.helicopter_registration} ({order.helicopter_type})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/flight-orders/${id}/edit`)}
            >
              <Pencil className="mr-xs h-4 w-4" />
              Edytuj
            </Button>
          )}
          {canSubmit && (
            <Button
              size="sm"
              className="bg-primary text-white hover:bg-primary-hover"
              disabled={statusActionLoading}
              onClick={() => doStatusTransition(2)}
            >
              Przekaż do akceptacji
            </Button>
          )}
          {canReject && (
            <Button
              size="sm"
              variant="outline"
              className="border-accent text-accent hover:bg-[#FFF5F5]"
              disabled={statusActionLoading}
              onClick={() => doStatusTransition(3)}
            >
              Odrzuć
            </Button>
          )}
          {canAccept && (
            <Button
              size="sm"
              className="bg-green-700 text-white hover:bg-green-800"
              disabled={statusActionLoading}
              onClick={() => doStatusTransition(4)}
            >
              Zaakceptuj
            </Button>
          )}
          {canComplete && (
            <>
              <Button
                size="sm"
                className="bg-orange-600 text-white hover:bg-orange-700"
                disabled={statusActionLoading}
                onClick={() => handleCompletion(5)}
              >
                Zrealizowane w części
              </Button>
              <Button
                size="sm"
                className="bg-green-700 text-white hover:bg-green-800"
                disabled={statusActionLoading}
                onClick={() => handleCompletion(6)}
              >
                Zrealizowane w całości
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-secondary text-secondary hover:bg-surface"
                disabled={statusActionLoading}
                onClick={() => handleCompletion(7)}
              >
                Nie zrealizowane
              </Button>
            </>
          )}
        </div>
      </div>

      {statusActionError && (
        <div className="mb-lg rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {statusActionError}
        </div>
      )}

      {/* Completion dialog */}
      {showCompletionDialog && (
        <div className="mb-lg rounded-md border border-border bg-surface p-lg">
          <h3 className="mb-md text-base font-semibold text-text">
            Podaj rzeczywiste daty lotu
          </h3>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <Label htmlFor="actual_start">Rzeczywiste rozpoczęcie *</Label>
              <DateTimePicker
                id="actual_start"
                value={actualStart}
                onChange={(value) => setActualStart(value)}
              />
            </div>
            <div>
              <Label htmlFor="actual_end">Rzeczywiste zakończenie *</Label>
              <DateTimePicker
                id="actual_end"
                value={actualEnd}
                onChange={(value) => setActualEnd(value)}
              />
            </div>
          </div>
          {completionError && (
            <p className="mt-sm text-xs text-accent">{completionError}</p>
          )}
          <div className="mt-md flex gap-sm">
            <Button
              size="sm"
              className="bg-primary text-white hover:bg-primary-hover"
              disabled={statusActionLoading}
              onClick={submitCompletion}
            >
              Potwierdź
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCompletionDialog(false)}
            >
              Anuluj
            </Button>
          </div>
        </div>
      )}

      {/* Order details */}
      <div className="mb-xl rounded-md border border-border bg-white p-lg">
        <h2 className="mb-md text-base font-semibold text-text">
          Szczegóły zlecenia
        </h2>
        <dl className="grid grid-cols-2 gap-md">
          <InfoRow label="Numer zlecenia" value={order.order_number} />
          <InfoRow label="Pilot" value={`${order.pilot_name} (${order.pilot_email})`} />
          <InfoRow
            label="Helikopter"
            value={`${order.helicopter_registration} - ${order.helicopter_type}`}
          />
          <InfoRow label="Status" value={<StatusBadge status={status} />} />
          <InfoRow
            label="Planowane rozpoczęcie"
            value={formatDateTime(order.planned_start_datetime)}
          />
          <InfoRow
            label="Planowane zakończenie"
            value={formatDateTime(order.planned_end_datetime)}
          />
          <InfoRow
            label="Rzeczywiste rozpoczęcie"
            value={formatDateTime(order.actual_start_datetime)}
          />
          <InfoRow
            label="Rzeczywiste zakończenie"
            value={formatDateTime(order.actual_end_datetime)}
          />
          <InfoRow
            label="Lotnisko startowe"
            value={order.start_airfield_name}
          />
          <InfoRow
            label="Lotnisko docelowe"
            value={order.end_airfield_name}
          />
          <InfoRow
            label="Łączna waga załogi"
            value={
              order.crew_total_weight_kg != null
                ? `${order.crew_total_weight_kg} kg`
                : "—"
            }
          />
          <InfoRow
            label="Szacowana długość trasy"
            value={
              order.estimated_route_length_km != null
                ? `${order.estimated_route_length_km.toFixed(2)} km`
                : "—"
            }
          />
          <InfoRow
            label="Utworzono"
            value={formatDateTime(order.created_at)}
          />
          <InfoRow
            label="Zaktualizowano"
            value={formatDateTime(order.updated_at)}
          />
        </dl>
      </div>

      {/* Crew members */}
      <div className="mb-xl rounded-md border border-border bg-white p-lg">
        <h2 className="mb-md text-base font-semibold text-text">
          Załoga
        </h2>
        {order.crew_members.length === 0 ? (
          <p className="text-sm text-text-muted">
            Brak dodatkowych członków załogi.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">
                  Imię i nazwisko
                </th>
                <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">
                  Rola
                </th>
                <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">
                  Waga (kg)
                </th>
                <th className="py-xs text-left text-xs font-medium text-text-muted">
                  Szkolenie ważne do
                </th>
              </tr>
            </thead>
            <tbody>
              {order.crew_members.map((cm) => (
                <tr
                  key={cm.crew_member_id}
                  className="border-b border-border-subtle last:border-0"
                >
                  <td className="py-xs pr-md text-sm">
                    {cm.first_name} {cm.last_name}
                  </td>
                  <td className="py-xs pr-md text-sm">{cm.role}</td>
                  <td className="py-xs pr-md text-sm">{cm.weight_kg}</td>
                  <td className="py-xs text-sm">
                    {cm.training_expiry_date
                      ? cm.training_expiry_date.substring(0, 10)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Linked operations */}
      <div className="mb-xl rounded-md border border-border bg-white p-lg">
        <h2 className="mb-md text-base font-semibold text-text">
          Powiązane operacje
        </h2>
        {order.operations.length === 0 ? (
          <p className="text-sm text-text-muted">Brak powiązanych operacji.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">
                  Numer operacji
                </th>
                <th className="py-xs pr-md text-left text-xs font-medium text-text-muted">
                  Opis
                </th>
                <th className="py-xs text-left text-xs font-medium text-text-muted">
                  Długość trasy
                </th>
              </tr>
            </thead>
            <tbody>
              {order.operations.map((op) => (
                <tr
                  key={op.operation_id}
                  className="cursor-pointer border-b border-border-subtle last:border-0 hover:bg-surface"
                  onClick={() => navigate(`/operations/${op.operation_id}`)}
                >
                  <td className="py-xs pr-md text-sm font-medium text-primary">
                    {op.operation_number}
                  </td>
                  <td className="py-xs pr-md text-sm">
                    {op.short_description}
                  </td>
                  <td className="py-xs text-sm">
                    {op.route_distance_km != null
                      ? `${op.route_distance_km.toFixed(2)} km`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Map (FLT-04) */}
      <div className="mb-xl">
        <h2 className="mb-md text-base font-semibold text-text">
          Mapa trasy
        </h2>
        <FlightOrderMap
          startAirfield={startAirfield}
          endAirfield={endAirfield}
          operations={order.operations as any}
        />
      </div>
    </div>
  );
}
