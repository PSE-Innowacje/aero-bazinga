import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { PermissionLevel } from "shared/permissions";
import type { PlannedOperation, OperationTypeRow } from "shared/types";
import { OPERATION_STATUS_LABELS_PL } from "shared/statuses";
import { UserRole } from "shared/roles";

// Textarea component (not in shadcn set, using plain HTML styled)
function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-[120px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-text placeholder:text-secondary focus-visible:outline-none focus-visible:border-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y ${className ?? ""}`}
      {...props}
    />
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-accent">{message}</p>;
}

interface FormErrors {
  project_reference?: string;
  short_description?: string;
  operation_type_ids?: string;
  kml_file?: string;
  contact_emails?: string;
  additional_info?: string;
  planned_earliest_date?: string;
  planned_latest_date?: string;
  post_completion_notes?: string;
  server?: string;
}

export function OperationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const { user, permissions } = useAuth();

  const isSupervisor = user?.role === UserRole.SUPERVISOR || user?.role === UserRole.SUPERADMIN;
  const isPlanner = user?.role === UserRole.PLANNER;
  const canWrite = permissions?.planowanie_operacji === PermissionLevel.CRUD;

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [existing, setExisting] = useState<PlannedOperation | null>(null);
  const [operationTypes, setOperationTypes] = useState<OperationTypeRow[]>([]);

  // Form state
  const [projectReference, setProjectReference] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
  const [proposedEarliestDate, setProposedEarliestDate] = useState("");
  const [proposedLatestDate, setProposedLatestDate] = useState("");
  const [plannedEarliestDate, setPlannedEarliestDate] = useState("");
  const [plannedLatestDate, setPlannedLatestDate] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [postCompletionNotes, setPostCompletionNotes] = useState("");
  const [contactEmailsRaw, setContactEmailsRaw] = useState(""); // comma-separated
  const [kmlFile, setKmlFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load operation types
  useEffect(() => {
    fetch("/api/operations/types/list", { credentials: "include" })
      .then((res) => res.ok ? res.json() : Promise.reject("Błąd ładowania typów"))
      .then((data) => setOperationTypes(data.types ?? []))
      .catch(() => {/* types not critical to fail the page */});
  }, []);

  // Load existing operation for edit
  useEffect(() => {
    if (isEdit && id) {
      fetch(`/api/operations/${id}`, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Nie udało się pobrać operacji.");
          return res.json();
        })
        .then((data) => {
          const op: PlannedOperation = data.operation;
          setExisting(op);
          setProjectReference(op.project_reference ?? "");
          setShortDescription(op.short_description ?? "");
          setSelectedTypeIds(
            operationTypes
              .filter((t) => op.operation_types?.includes(t.name))
              .map((t) => t.id)
          );
          setProposedEarliestDate(op.proposed_earliest_date?.substring(0, 10) ?? "");
          setProposedLatestDate(op.proposed_latest_date?.substring(0, 10) ?? "");
          setPlannedEarliestDate(op.planned_earliest_date?.substring(0, 10) ?? "");
          setPlannedLatestDate(op.planned_latest_date?.substring(0, 10) ?? "");
          setAdditionalInfo(op.additional_info ?? "");
          setPostCompletionNotes(op.post_completion_notes ?? "");
          setContactEmailsRaw((op.contact_persons ?? []).join(", "));
          setIsLoading(false);
        })
        .catch((err: Error) => {
          setErrors({ server: err.message });
          setIsLoading(false);
        });
    }
  }, [id, isEdit]); // operationTypes dep handled below

  // After types load, if editing, update selectedTypeIds
  useEffect(() => {
    if (existing && operationTypes.length > 0) {
      setSelectedTypeIds(
        operationTypes
          .filter((t) => existing.operation_types?.includes(t.name))
          .map((t) => t.id)
      );
    }
  }, [existing, operationTypes]);

  function toggleType(typeId: number) {
    setSelectedTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!projectReference.trim()) errs.project_reference = "Numer projektu jest wymagany.";
    else if (projectReference.trim().length > 30) errs.project_reference = "Max 30 znaków.";

    if (!shortDescription.trim()) errs.short_description = "Krótki opis jest wymagany.";
    else if (shortDescription.trim().length > 100) errs.short_description = "Max 100 znaków.";

    if (selectedTypeIds.length === 0) errs.operation_type_ids = "Wybierz co najmniej jeden typ operacji.";

    if (!isEdit && !kmlFile) errs.kml_file = "Plik KML jest wymagany.";

    if (additionalInfo.trim().length > 500) errs.additional_info = "Max 500 znaków.";

    if (isSupervisor && postCompletionNotes.trim().length > 500) {
      errs.post_completion_notes = "Max 500 znaków.";
    }

    // Validate contact emails if provided
    if (contactEmailsRaw.trim()) {
      const emails = contactEmailsRaw.split(",").map((e) => e.trim()).filter(Boolean);
      for (const email of emails) {
        if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
          errs.contact_emails = `Nieprawidłowy adres email: ${email}`;
          break;
        }
      }
    }

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

    const contactEmails = contactEmailsRaw
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const formData = new FormData();
    formData.append("project_reference", projectReference.trim());
    formData.append("short_description", shortDescription.trim());
    formData.append("operation_type_ids", JSON.stringify(selectedTypeIds));
    if (proposedEarliestDate) formData.append("proposed_earliest_date", proposedEarliestDate);
    if (proposedLatestDate) formData.append("proposed_latest_date", proposedLatestDate);
    if (additionalInfo.trim()) formData.append("additional_info", additionalInfo.trim());
    formData.append("contact_emails", JSON.stringify(contactEmails));

    if (isSupervisor) {
      if (plannedEarliestDate) formData.append("planned_earliest_date", plannedEarliestDate);
      if (plannedLatestDate) formData.append("planned_latest_date", plannedLatestDate);
      if (postCompletionNotes.trim() && existing && existing.status >= 5) {
        formData.append("post_completion_notes", postCompletionNotes.trim());
      }
    }

    if (kmlFile) {
      formData.append("kml_file", kmlFile);
    }

    const url = isEdit ? `/api/operations/${id}` : "/api/operations";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
        // No Content-Type header — browser sets it with boundary for multipart
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ server: data.message || "Błąd serwera." });
        toast.error(data.message || "Nie udało się zapisać operacji");
        return;
      }
      toast.success(isEdit ? "Zmiany zostały zapisane" : "Operacja została utworzona");
      navigate(`/operations/${data.operation.id}`);
    } catch {
      setErrors({ server: "Błąd serwera. Spróbuj ponownie." });
      toast.error("Błąd serwera. Spróbuj ponownie");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canEditPlannedDates = isSupervisor;
  const showPostCompletionNotes = isSupervisor && existing && existing.status >= 5;

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (!canWrite) {
    navigate("/operations");
    return null;
  }

  const statusLabel = existing
    ? OPERATION_STATUS_LABELS_PL[existing.status as keyof typeof OPERATION_STATUS_LABELS_PL] ?? String(existing.status)
    : null;

  return (
    <div className="max-w-3xl">
      <Link
        to={isEdit && id ? `/operations/${id}` : "/operations"}
        className="mb-lg inline-flex items-center text-sm text-primary hover:underline"
      >
        <ChevronLeft className="h-4 w-4" />
        {isEdit ? "Powrót do operacji" : "Planowane operacje"}
      </Link>

      <h1 className="mb-xl text-heading font-semibold text-primary">
        {isEdit ? "Edytuj operację" : "Nowa operacja"}
      </h1>

      {/* Read-only info for edit mode */}
      {isEdit && existing && (
        <div className="mb-lg rounded-md border border-border-subtle bg-surface p-md">
          <div className="grid grid-cols-2 gap-md text-sm">
            <div>
              <span className="text-text-muted">Numer operacji: </span>
              <span className="font-medium text-primary">{existing.operation_number}</span>
            </div>
            <div>
              <span className="text-text-muted">Status: </span>
              <span className="font-medium">{statusLabel}</span>
            </div>
            {existing.route_distance_km != null && (
              <div>
                <span className="text-text-muted">Długość trasy: </span>
                <span className="font-medium">{existing.route_distance_km.toFixed(2)} km</span>
              </div>
            )}
            <div>
              <span className="text-text-muted">Utworzona przez: </span>
              <span className="font-medium">{existing.created_by_email}</span>
            </div>
          </div>
        </div>
      )}

      {errors.server && (
        <div className="mb-lg rounded-md border border-accent bg-[#FFF5F5] p-md text-sm text-accent">
          {errors.server}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-md" encType="multipart/form-data">
        {/* Project reference */}
        <div>
          <Label htmlFor="project_reference">Numer projektu *</Label>
          <Input
            id="project_reference"
            value={projectReference}
            onChange={(e) => setProjectReference(e.target.value)}
            maxLength={30}
            placeholder="np. PRJ-2026-001"
            className="mt-xs"
          />
          <FieldError message={errors.project_reference} />
        </div>

        {/* Short description */}
        <div>
          <Label htmlFor="short_description">Krótki opis *</Label>
          <Input
            id="short_description"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            maxLength={100}
            placeholder="Krótki opis operacji"
            className="mt-xs"
          />
          <FieldError message={errors.short_description} />
        </div>

        {/* Operation types */}
        <div>
          <Label>Typy operacji *</Label>
          <div className="mt-xs flex flex-wrap gap-sm">
            {operationTypes.map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer items-center gap-xs rounded-md border px-sm py-xs text-sm transition-colors ${
                  selectedTypeIds.includes(t.id)
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-white text-text hover:border-primary"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selectedTypeIds.includes(t.id)}
                  onChange={() => toggleType(t.id)}
                />
                {t.name}
              </label>
            ))}
          </div>
          <FieldError message={errors.operation_type_ids} />
        </div>

        {/* Proposed dates */}
        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="proposed_earliest_date">Proponowana data najwcześniejsza</Label>
            <DatePicker
              id="proposed_earliest_date"
              value={proposedEarliestDate}
              onChange={(value) => setProposedEarliestDate(value)}
            />
          </div>
          <div>
            <Label htmlFor="proposed_latest_date">Proponowana data najpóźniejsza</Label>
            <DatePicker
              id="proposed_latest_date"
              value={proposedLatestDate}
              onChange={(value) => setProposedLatestDate(value)}
            />
          </div>
        </div>

        {/* Planned dates — supervisor only */}
        {canEditPlannedDates && (
          <div className="grid grid-cols-2 gap-md">
            <div>
              <Label htmlFor="planned_earliest_date">Planowana data najwcześniejsza</Label>
              <DatePicker
                id="planned_earliest_date"
                value={plannedEarliestDate}
                onChange={(value) => setPlannedEarliestDate(value)}
              />
              <FieldError message={errors.planned_earliest_date} />
            </div>
            <div>
              <Label htmlFor="planned_latest_date">Planowana data najpóźniejsza</Label>
              <DatePicker
                id="planned_latest_date"
                value={plannedLatestDate}
                onChange={(value) => setPlannedLatestDate(value)}
              />
              <FieldError message={errors.planned_latest_date} />
            </div>
          </div>
        )}

        {/* Additional info */}
        <div style={{gridColumn: '1 / -1'}}>
          <Label htmlFor="additional_info">Dodatkowe informacje / priorytety</Label>
          <Textarea
            id="additional_info"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            maxLength={500}
            placeholder="Opcjonalne uwagi, priorytety..."
            className="mt-xs w-full border border-border rounded-md"
            style={{ minHeight: "160px" }}
          />
          <div className="mt-xs flex justify-end text-xs text-text-muted">
            {additionalInfo.length}/500
          </div>
          <FieldError message={errors.additional_info} />
        </div>

        {/* Post-completion notes — supervisor only, status >= 5 */}
        {showPostCompletionNotes && (
          <div>
            <Label htmlFor="post_completion_notes">Uwagi porealizacyjne</Label>
            <Textarea
              id="post_completion_notes"
              value={postCompletionNotes}
              onChange={(e) => setPostCompletionNotes(e.target.value)}
              maxLength={500}
              placeholder="Uwagi po realizacji operacji..."
              className="mt-xs"
            />
            <div className="mt-xs flex justify-end text-xs text-text-muted">
              {postCompletionNotes.length}/500
            </div>
            <FieldError message={errors.post_completion_notes} />
          </div>
        )}

        {/* Contact persons */}
        <div>
          <Label htmlFor="contact_emails">Osoby kontaktowe (adresy email, oddzielone przecinkami)</Label>
          <Input
            id="contact_emails"
            value={contactEmailsRaw}
            onChange={(e) => setContactEmailsRaw(e.target.value)}
            placeholder="jan.kowalski@example.com, anna.nowak@example.com"
            className="mt-xs"
          />
          <FieldError message={errors.contact_emails} />
        </div>

        {/* KML file */}
        <div>
          <Label>
            Plik trasy KML {!isEdit && <span className="text-accent">*</span>}
          </Label>
          <div className="mt-xs">
            <input
              ref={fileInputRef}
              type="file"
              accept=".kml"
              onChange={(e) => { setKmlFile(e.target.files?.[0] ?? null); }}
              className="hidden"
            />
            {kmlFile ? (
              <div className="flex items-center gap-sm rounded-md border border-border bg-surface px-md py-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span className="flex-1 truncate text-sm font-medium">{kmlFile.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setKmlFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="shrink-0 flex items-center justify-center h-8 w-8 rounded-md text-text-muted hover:text-accent hover:bg-[#FFF5F5] transition-colors"
                  aria-label="Usuń plik"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-primary", "bg-primary/5");
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.name.endsWith(".kml")) {
                    setKmlFile(file);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-sm rounded-lg border-2 border-dashed border-border bg-surface px-lg py-xl cursor-pointer transition-colors hover:border-primary hover:bg-[#EBF2FA]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span className="text-sm font-semibold text-primary">Przeciągnij plik KML tutaj</span>
                <span className="text-xs text-text-muted">lub kliknij, aby wybrać z dysku</span>
              </div>
            )}
            {isEdit && !kmlFile && (
              <p className="mt-xs text-xs text-text-muted">
                Pozostaw puste, aby zachować istniejący plik KML.
              </p>
            )}
          </div>
          <FieldError message={errors.kml_file} />
        </div>

        <div className="pt-md">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-white hover:bg-primary-hover"
          >
            {isSubmitting ? "Zapisywanie..." : isEdit ? "Zapisz zmiany" : "Utwórz operację"}
          </Button>
        </div>
      </form>
    </div>
  );
}
