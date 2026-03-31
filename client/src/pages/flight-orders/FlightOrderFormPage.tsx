import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import type {
  Helicopter,
  Airfield,
  CrewMember,
  PlannedOperation,
  FlightOrder,
  FlightOrderValidationWarning,
  KmlPoint,
} from "shared/types";
import { FLIGHT_ORDER_STATUS_LABELS_PL } from "shared/statuses";
import { UserRole } from "shared/roles";
import { PermissionLevel } from "shared/permissions";
import "leaflet/dist/leaflet.css";

interface FormErrors {
  planned_start_datetime?: string;
  planned_end_datetime?: string;
  helicopter_id?: string;
  start_airfield_id?: string;
  end_airfield_id?: string;
  operation_ids?: string;
  server?: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-accent">{message}</p>;
}

// Map component for form preview
function FormMap({
  startAirfield,
  endAirfield,
  operations,
}: {
  startAirfield: Airfield | null;
  endAirfield: Airfield | null;
  operations: PlannedOperation[];
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
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) return;

      const map = L.map(mapRef.current);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
        maxZoom: 18,
      }).addTo(map);

      const bounds: [number, number][] = [];

      if (startAirfield) {
        const startIcon = L.divIcon({
          className: "",
          html: `<div style="background:#16a34a;border:2px solid #fff;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([startAirfield.latitude, startAirfield.longitude], { icon: startIcon })
          .addTo(map)
          .bindPopup(`Start: ${startAirfield.name}`);
        bounds.push([startAirfield.latitude, startAirfield.longitude]);
      }

      const colors = ["#003E7E", "#D20A11", "#2563eb", "#9333ea", "#ea580c"];
      operations.forEach((op, idx) => {
        const points: KmlPoint[] = Array.isArray(op.kml_points_json) ? op.kml_points_json : [];
        if (points.length === 0) return;
        const latlngs: [number, number][] = points.map((p) => [p.lat, p.lng]);
        const color = colors[idx % colors.length];
        L.polyline(latlngs, { color, weight: 3 }).addTo(map);
        for (const pt of points) {
          L.circleMarker([pt.lat, pt.lng], {
            radius: 3, color, fillColor: color, fillOpacity: 0.8, weight: 1,
          }).addTo(map);
          bounds.push([pt.lat, pt.lng]);
        }
      });

      if (endAirfield) {
        const endIcon = L.divIcon({
          className: "",
          html: `<div style="background:#D20A11;border:2px solid #fff;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([endAirfield.latitude, endAirfield.longitude], { icon: endIcon })
          .addTo(map)
          .bindPopup(`Lądowanie: ${endAirfield.name}`);
        bounds.push([endAirfield.latitude, endAirfield.longitude]);
      }

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else {
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
      style={{ height: "350px", width: "100%" }}
    />
  );
}

export function FlightOrderFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user, permissions } = useAuth();

  const isPilot = user?.role === UserRole.PILOT || user?.role === UserRole.SUPERADMIN;
  const canCreate = permissions?.zlecenia_na_lot === PermissionLevel.CRUD;
  const canEditFO = permissions ? [PermissionLevel.CRUD, PermissionLevel.EDIT_VIEW].includes(permissions.zlecenia_na_lot) : false;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [existing, setExisting] = useState<FlightOrder | null>(null);

  // Reference data
  const [helicopters, setHelicopters] = useState<Helicopter[]>([]);
  const [airfields, setAirfields] = useState<Airfield[]>([]);
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [availableOps, setAvailableOps] = useState<PlannedOperation[]>([]);

  // Form state
  const [plannedStartDatetime, setPlannedStartDatetime] = useState("");
  const [plannedEndDatetime, setPlannedEndDatetime] = useState("");
  const [helicopterId, setHelicopterId] = useState("");
  const [startAirfieldId, setStartAirfieldId] = useState("");
  const [endAirfieldId, setEndAirfieldId] = useState("");
  const [selectedCrewIds, setSelectedCrewIds] = useState<number[]>([]);
  const [selectedOpIds, setSelectedOpIds] = useState<number[]>([]);

  // Validation
  const [validationWarnings, setValidationWarnings] = useState<FlightOrderValidationWarning[]>([]);
  const [crewTotalWeight, setCrewTotalWeight] = useState<number | null>(null);
  const [estimatedRouteLength, setEstimatedRouteLength] = useState<number | null>(null);

  // Load reference data
  useEffect(() => {
    const loads = [
      fetch("/api/flight-orders/helicopters/list", { credentials: "include" })
        .then((r) => r.ok ? r.json() : Promise.reject(""))
        .then((d) => setHelicopters(d.helicopters ?? []))
        .catch(() => {}),
      fetch("/api/flight-orders/airfields/list", { credentials: "include" })
        .then((r) => r.ok ? r.json() : Promise.reject(""))
        .then((d) => setAirfields(d.airfields ?? []))
        .catch(() => {}),
      fetch("/api/flight-orders/crew/list", { credentials: "include" })
        .then((r) => r.ok ? r.json() : Promise.reject(""))
        .then((d) => setCrewMembers(d.crew ?? []))
        .catch(() => {}),
      // Fetch status 3 ops for selection (and status 4 for already-linked in edit)
      fetch("/api/operations?status=3", { credentials: "include" })
        .then((r) => r.ok ? r.json() : Promise.reject(""))
        .then((d) => setAvailableOps(d.operations ?? []))
        .catch(() => {}),
    ];

    Promise.all(loads).then(() => {
      if (!isEdit) setIsLoading(false);
    });
  }, []);

  // Load existing flight order for edit
  useEffect(() => {
    if (isEdit && id) {
      fetch(`/api/flight-orders/${id}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Nie udało się pobrać zlecenia.");
          return res.json();
        })
        .then((data) => {
          const fo: FlightOrder = data.order;
          setExisting(fo);
          setPlannedStartDatetime(
            fo.planned_start_datetime
              ? new Date(fo.planned_start_datetime).toISOString().slice(0, 16)
              : ""
          );
          setPlannedEndDatetime(
            fo.planned_end_datetime
              ? new Date(fo.planned_end_datetime).toISOString().slice(0, 16)
              : ""
          );
          setHelicopterId(String(fo.helicopter_id));
          setStartAirfieldId(String(fo.start_airfield_id));
          setEndAirfieldId(String(fo.end_airfield_id));
          setSelectedCrewIds(fo.crew_members.map((cm) => cm.crew_member_id));
          setSelectedOpIds(fo.operations.map((op) => op.operation_id));
          setCrewTotalWeight(fo.crew_total_weight_kg);
          setEstimatedRouteLength(fo.estimated_route_length_km);

          // Also fetch already-linked operations (status 4) so they appear in the list
          fetch("/api/operations?status=4", { credentials: "include" })
            .then((r) => r.ok ? r.json() : Promise.reject(""))
            .then((d) => {
              const status4Ops = d.operations ?? [];
              setAvailableOps((prev) => {
                const ids = new Set(prev.map((o: PlannedOperation) => o.id));
                const merged = [...prev];
                for (const op of status4Ops) {
                  if (!ids.has(op.id)) {
                    merged.push(op);
                  }
                }
                return merged;
              });
            })
            .catch(() => {});

          setIsLoading(false);
        })
        .catch((err: Error) => {
          setErrors({ server: err.message });
          setIsLoading(false);
        });
    }
  }, [id, isEdit]);

  // Run dry-validation when relevant fields change
  const runValidation = useCallback(() => {
    if (!helicopterId || !plannedStartDatetime) {
      setValidationWarnings([]);
      setCrewTotalWeight(null);
      setEstimatedRouteLength(null);
      return;
    }

    fetch("/api/flight-orders/validate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        helicopter_id: parseInt(helicopterId, 10),
        crew_member_ids: selectedCrewIds,
        operation_ids: selectedOpIds,
        planned_start_datetime: new Date(plannedStartDatetime).toISOString(),
      }),
    })
      .then((r) => r.ok ? r.json() : r.json().then((d) => { throw d; }))
      .then((data) => {
        setValidationWarnings(data.warnings ?? []);
        setCrewTotalWeight(data.crew_total_weight_kg ?? null);
        setEstimatedRouteLength(data.estimated_route_length_km ?? null);
      })
      .catch(() => {
        setValidationWarnings([]);
      });
  }, [helicopterId, selectedCrewIds, selectedOpIds, plannedStartDatetime]);

  useEffect(() => {
    const timer = setTimeout(runValidation, 500);
    return () => clearTimeout(timer);
  }, [runValidation]);

  function toggleCrewMember(cmId: number) {
    setSelectedCrewIds((prev) =>
      prev.includes(cmId) ? prev.filter((id) => id !== cmId) : [...prev, cmId]
    );
  }

  function toggleOperation(opId: number) {
    setSelectedOpIds((prev) =>
      prev.includes(opId) ? prev.filter((id) => id !== opId) : [...prev, opId]
    );
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!plannedStartDatetime) errs.planned_start_datetime = "Data rozpoczęcia jest wymagana.";
    if (!plannedEndDatetime) errs.planned_end_datetime = "Data zakończenia jest wymagana.";
    if (!helicopterId) errs.helicopter_id = "Helikopter jest wymagany.";
    if (!startAirfieldId) errs.start_airfield_id = "Lotnisko startowe jest wymagane.";
    if (!endAirfieldId) errs.end_airfield_id = "Lotnisko docelowe jest wymagane.";
    return errs;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const payload = {
      planned_start_datetime: new Date(plannedStartDatetime).toISOString(),
      planned_end_datetime: new Date(plannedEndDatetime).toISOString(),
      helicopter_id: parseInt(helicopterId, 10),
      start_airfield_id: parseInt(startAirfieldId, 10),
      end_airfield_id: parseInt(endAirfieldId, 10),
      crew_member_ids: selectedCrewIds,
      operation_ids: selectedOpIds,
    };

    const url = isEdit ? `/api/flight-orders/${id}` : "/api/flight-orders";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.warnings) {
          setValidationWarnings(data.warnings);
          setErrors({ server: data.message || "Walidacja nie powiodła się." });
        } else {
          setErrors({ server: data.message || "Błąd serwera." });
        }
        return;
      }
      navigate(`/flight-orders/${data.order.id}`);
    } catch {
      setErrors({ server: "Błąd serwera. Spróbuj ponownie." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Computed values for map
  const selectedStartAirfield = airfields.find(
    (a) => a.id === parseInt(startAirfieldId, 10)
  ) ?? null;
  const selectedEndAirfield = airfields.find(
    (a) => a.id === parseInt(endAirfieldId, 10)
  ) ?? null;
  const selectedOperations = availableOps.filter((op) =>
    selectedOpIds.includes(op.id)
  );

  // Filter out the pilot's own crew_member_id from selectable crew
  const pilotCrewMemberId = user?.crewMemberId;
  const selectableCrewMembers = crewMembers.filter(
    (cm) => cm.id !== pilotCrewMemberId
  );

  if (isLoading) {
    return <p className="text-body text-text-muted">Ładowanie...</p>;
  }

  if ((!isEdit && !canCreate) || (isEdit && !canEditFO)) {
    navigate("/flight-orders");
    return null;
  }

  const statusLabel = existing
    ? FLIGHT_ORDER_STATUS_LABELS_PL[
        existing.status as keyof typeof FLIGHT_ORDER_STATUS_LABELS_PL
      ] ?? String(existing.status)
    : null;

  return (
    <div className="max-w-2xl">
      <Link
        to={isEdit && id ? `/flight-orders/${id}` : "/flight-orders"}
        className="mb-lg inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        {isEdit ? "Powrót do zlecenia" : "Zlecenia na lot"}
      </Link>

      <h1 className="mb-xl text-heading font-semibold text-primary">
        {isEdit ? "Edytuj zlecenie na lot" : "Nowe zlecenie na lot"}
      </h1>

      {/* Read-only info for edit mode */}
      {isEdit && existing && (
        <div className="mb-lg rounded-md border border-border-subtle bg-surface p-md">
          <div className="grid grid-cols-2 gap-md text-sm">
            <div>
              <span className="text-text-muted">Numer zlecenia: </span>
              <span className="font-medium text-primary">
                {existing.order_number}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Status: </span>
              <span className="font-medium">{statusLabel}</span>
            </div>
            <div>
              <span className="text-text-muted">Pilot: </span>
              <span className="font-medium">{existing.pilot_name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pilot info (auto-filled) */}
      {!isEdit && user && (
        <div className="mb-lg rounded-md border border-border-subtle bg-surface p-md">
          <div className="text-sm">
            <span className="text-text-muted">Pilot (automatycznie): </span>
            <span className="font-medium text-primary">
              {user.firstName} {user.lastName} ({user.email})
            </span>
          </div>
        </div>
      )}

      {/* Validation warnings */}
      {validationWarnings.length > 0 && (
        <div className="mb-lg rounded-md border border-orange-300 bg-orange-50 p-md">
          <div className="mb-sm flex items-center gap-sm text-sm font-semibold text-orange-800">
            <AlertTriangle className="h-4 w-4" />
            Ostrzeżenia walidacji
          </div>
          <ul className="ml-lg list-disc space-y-xs">
            {validationWarnings.map((w, i) => (
              <li key={i} className="text-sm text-orange-800">
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {errors.server && (
        <div className="mb-lg rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {errors.server}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-md">
        {/* Planned dates */}
        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="planned_start_datetime">
              Planowane rozpoczęcie *
            </Label>
            <DateTimePicker
              id="planned_start_datetime"
              value={plannedStartDatetime}
              onChange={(value) => setPlannedStartDatetime(value)}
            />
            <FieldError message={errors.planned_start_datetime} />
          </div>
          <div>
            <Label htmlFor="planned_end_datetime">
              Planowane zakończenie *
            </Label>
            <DateTimePicker
              id="planned_end_datetime"
              value={plannedEndDatetime}
              onChange={(value) => setPlannedEndDatetime(value)}
            />
            <FieldError message={errors.planned_end_datetime} />
          </div>
        </div>

        {/* Helicopter */}
        <div>
          <Label>Helikopter *</Label>
          <Select value={helicopterId} onValueChange={setHelicopterId}>
            <SelectTrigger className="mt-xs">
              <SelectValue placeholder="Wybierz helikopter" />
            </SelectTrigger>
            <SelectContent>
              {helicopters.map((h) => (
                <SelectItem key={h.id} value={String(h.id)}>
                  {h.registration_number} - {h.type} (max {h.max_crew_count}{" "}
                  os., {h.max_crew_payload_kg} kg, {h.range_km} km)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError message={errors.helicopter_id} />
        </div>

        {/* Airfields */}
        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label>Lotnisko startowe *</Label>
            <Select value={startAirfieldId} onValueChange={setStartAirfieldId}>
              <SelectTrigger className="mt-xs">
                <SelectValue placeholder="Wybierz lotnisko" />
              </SelectTrigger>
              <SelectContent>
                {airfields.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.start_airfield_id} />
          </div>
          <div>
            <Label>Lotnisko docelowe *</Label>
            <Select value={endAirfieldId} onValueChange={setEndAirfieldId}>
              <SelectTrigger className="mt-xs">
                <SelectValue placeholder="Wybierz lotnisko" />
              </SelectTrigger>
              <SelectContent>
                {airfields.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.end_airfield_id} />
          </div>
        </div>

        {/* Crew members (multi-select checkboxes) */}
        <div>
          <Label>Dodatkowi członkowie załogi</Label>
          <div className="mt-xs max-h-[200px] overflow-auto rounded-md border border-border p-sm">
            {selectableCrewMembers.length === 0 ? (
              <p className="text-sm text-text-muted">Brak dostępnych członków załogi.</p>
            ) : (
              selectableCrewMembers.map((cm) => (
                <label
                  key={cm.id}
                  className={`flex cursor-pointer items-center gap-sm rounded-md px-sm py-xs text-sm transition-colors ${
                    selectedCrewIds.includes(cm.id)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-surface"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedCrewIds.includes(cm.id)}
                    onChange={() => toggleCrewMember(cm.id)}
                  />
                  <span>
                    {cm.first_name} {cm.last_name} ({cm.role}) - {cm.weight_kg}{" "}
                    kg
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Operations (multi-select checkboxes, status 3 only) */}
        <div>
          <Label>Powiązane operacje (status: Potwierdzone do planu)</Label>
          <div className="mt-xs max-h-[200px] overflow-auto rounded-md border border-border p-sm">
            {availableOps.length === 0 ? (
              <p className="text-sm text-text-muted">
                Brak operacji o statusie "Potwierdzone do planu".
              </p>
            ) : (
              availableOps.map((op) => (
                <label
                  key={op.id}
                  className={`flex cursor-pointer items-center gap-sm rounded-md px-sm py-xs text-sm transition-colors ${
                    selectedOpIds.includes(op.id)
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-surface"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={selectedOpIds.includes(op.id)}
                    onChange={() => toggleOperation(op.id)}
                  />
                  <span>
                    {op.operation_number} - {op.short_description}
                    {op.route_distance_km != null && (
                      <span className="text-text-muted">
                        {" "}
                        ({op.route_distance_km.toFixed(2)} km)
                      </span>
                    )}
                  </span>
                </label>
              ))
            )}
          </div>
          <FieldError message={errors.operation_ids} />
        </div>

        {/* Auto-calculated values */}
        <div className="grid grid-cols-2 gap-md rounded-md border border-border-subtle bg-surface p-md">
          <div>
            <span className="text-xs font-medium text-text-muted">
              Łączna waga załogi:
            </span>
            <span className="ml-sm text-sm font-medium text-text">
              {crewTotalWeight != null ? `${crewTotalWeight} kg` : "—"}
            </span>
          </div>
          <div>
            <span className="text-xs font-medium text-text-muted">
              Szacowana długość trasy:
            </span>
            <span className="ml-sm text-sm font-medium text-text">
              {estimatedRouteLength != null
                ? `${estimatedRouteLength.toFixed(2)} km`
                : "—"}
            </span>
          </div>
        </div>

        {/* Map preview */}
        {(selectedStartAirfield || selectedEndAirfield || selectedOperations.length > 0) && (
          <div>
            <Label>Podgląd trasy</Label>
            <div className="mt-xs">
              <FormMap
                startAirfield={selectedStartAirfield}
                endAirfield={selectedEndAirfield}
                operations={selectedOperations}
              />
            </div>
          </div>
        )}

        <div className="pt-md">
          <Button
            type="submit"
            disabled={isSubmitting || validationWarnings.length > 0}
            className="w-full bg-primary text-white hover:bg-primary-hover"
          >
            {isSubmitting
              ? "Zapisywanie..."
              : isEdit
                ? "Zapisz zmiany"
                : "Utwórz zlecenie"}
          </Button>
          {validationWarnings.length > 0 && (
            <p className="mt-sm text-center text-xs text-orange-700">
              Zapis zablokowany - popraw ostrzeżenia walidacji powyżej.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
