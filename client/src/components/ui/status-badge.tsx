import { cn } from "@/lib/utils";

// PSE brand-aligned status colors
// Primary Navy (#003E7E) for new/pending states
// Accent Red (#D20A11) for rejected/cancelled
// Steel Gray (#707070) for completed/neutral
const OPERATION_STATUS_COLORS: Record<number, string> = {
  1: "bg-[#EBF2FA] text-primary",          // Wprowadzone — navy tint
  2: "bg-[#FFF5F5] text-accent",            // Odrzucone — red tint
  3: "bg-[#E8F5E9] text-[#2E7D32]",         // Potwierdzone — green
  4: "bg-[#FFF3E0] text-[#E65100]",         // Zaplanowane — orange
  5: "bg-[#FFF8E1] text-[#F57F17]",         // Częściowo zrealizowane — amber
  6: "bg-surface text-secondary",            // Zrealizowane — gray
  7: "bg-surface text-text-muted",           // Rezygnacja — muted
};

const FLIGHT_ORDER_STATUS_COLORS: Record<number, string> = {
  1: "bg-[#EBF2FA] text-primary",           // Wprowadzone — navy tint
  2: "bg-[#FFF8E1] text-[#F57F17]",         // Przekazane — amber
  3: "bg-[#FFF5F5] text-accent",            // Odrzucone — red tint
  4: "bg-[#E8F5E9] text-[#2E7D32]",         // Zaakceptowane — green
  5: "bg-[#FFF3E0] text-[#E65100]",         // Częściowo zrealizowane — orange
  6: "bg-surface text-secondary",            // Zrealizowane — gray
  7: "bg-surface text-text-muted",           // Nie zrealizowane — muted
};

interface StatusBadgeProps {
  status: number;
  label: string;
  type?: "operation" | "flight-order";
  className?: string;
}

export function StatusBadge({
  status,
  label,
  type = "operation",
  className,
}: StatusBadgeProps) {
  const colors = type === "flight-order"
    ? FLIGHT_ORDER_STATUS_COLORS
    : OPERATION_STATUS_COLORS;
  const colorClass = colors[status] ?? "bg-surface text-text-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
