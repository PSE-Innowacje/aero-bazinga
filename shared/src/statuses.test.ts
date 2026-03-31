import { describe, it, expect } from "vitest";
import {
  OperationStatus,
  OPERATION_STATUS_LABELS_PL,
  FlightOrderStatus,
  FLIGHT_ORDER_STATUS_LABELS_PL,
} from "./statuses";

describe("OperationStatus", () => {
  it("has 7 statuses (1–7)", () => {
    const values = Object.values(OperationStatus).filter(
      (v) => typeof v === "number"
    );
    expect(values).toHaveLength(7);
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("maps correct Polish labels", () => {
    expect(OPERATION_STATUS_LABELS_PL[OperationStatus.WPROWADZONE]).toBe("Wprowadzone");
    expect(OPERATION_STATUS_LABELS_PL[OperationStatus.ODRZUCONE]).toBe("Odrzucone");
    expect(OPERATION_STATUS_LABELS_PL[OperationStatus.POTWIERDZONE]).toBe("Potwierdzone do planu");
    expect(OPERATION_STATUS_LABELS_PL[OperationStatus.ZAPLANOWANE]).toBe("Zaplanowane do zlecenia");
    expect(OPERATION_STATUS_LABELS_PL[OperationStatus.CZESCIOWO_ZREALIZOWANE]).toBe("Częściowo zrealizowane");
    expect(OPERATION_STATUS_LABELS_PL[OperationStatus.ZREALIZOWANE]).toBe("Zrealizowane");
    expect(OPERATION_STATUS_LABELS_PL[OperationStatus.REZYGNACJA]).toBe("Rezygnacja");
  });

  it("has a label for every status", () => {
    const statusValues = Object.values(OperationStatus).filter(
      (v) => typeof v === "number"
    ) as number[];
    for (const status of statusValues) {
      expect(
        OPERATION_STATUS_LABELS_PL[status as keyof typeof OPERATION_STATUS_LABELS_PL]
      ).toBeDefined();
    }
  });
});

describe("FlightOrderStatus", () => {
  it("has 7 statuses (1–7)", () => {
    const values = Object.values(FlightOrderStatus).filter(
      (v) => typeof v === "number"
    );
    expect(values).toHaveLength(7);
    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("maps correct Polish labels", () => {
    expect(FLIGHT_ORDER_STATUS_LABELS_PL[FlightOrderStatus.WPROWADZONE]).toBe("Wprowadzone");
    expect(FLIGHT_ORDER_STATUS_LABELS_PL[FlightOrderStatus.PRZEKAZANE]).toBe("Przekazane do akceptacji");
    expect(FLIGHT_ORDER_STATUS_LABELS_PL[FlightOrderStatus.ODRZUCONE]).toBe("Odrzucone");
    expect(FLIGHT_ORDER_STATUS_LABELS_PL[FlightOrderStatus.ZAAKCEPTOWANE]).toBe("Zaakceptowane");
    expect(FLIGHT_ORDER_STATUS_LABELS_PL[FlightOrderStatus.CZESCIOWO_ZREALIZOWANE]).toBe("Zrealizowane w części");
    expect(FLIGHT_ORDER_STATUS_LABELS_PL[FlightOrderStatus.ZREALIZOWANE]).toBe("Zrealizowane w całości");
    expect(FLIGHT_ORDER_STATUS_LABELS_PL[FlightOrderStatus.NIE_ZREALIZOWANE]).toBe("Nie zrealizowane");
  });

  it("has a label for every status", () => {
    const statusValues = Object.values(FlightOrderStatus).filter(
      (v) => typeof v === "number"
    ) as number[];
    for (const status of statusValues) {
      expect(
        FLIGHT_ORDER_STATUS_LABELS_PL[status as keyof typeof FLIGHT_ORDER_STATUS_LABELS_PL]
      ).toBeDefined();
    }
  });
});
