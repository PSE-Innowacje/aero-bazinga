export enum OperationStatus {
  WPROWADZONE = 1,
  ODRZUCONE = 2,
  POTWIERDZONE = 3,
  ZAPLANOWANE = 4,
  CZESCIOWO_ZREALIZOWANE = 5,
  ZREALIZOWANE = 6,
  REZYGNACJA = 7,
}

export const OPERATION_STATUS_LABELS_PL: Record<OperationStatus, string> = {
  [OperationStatus.WPROWADZONE]: "Wprowadzone",
  [OperationStatus.ODRZUCONE]: "Odrzucone",
  [OperationStatus.POTWIERDZONE]: "Potwierdzone do planu",
  [OperationStatus.ZAPLANOWANE]: "Zaplanowane do zlecenia",
  [OperationStatus.CZESCIOWO_ZREALIZOWANE]: "Częściowo zrealizowane",
  [OperationStatus.ZREALIZOWANE]: "Zrealizowane",
  [OperationStatus.REZYGNACJA]: "Rezygnacja",
};

export enum FlightOrderStatus {
  WPROWADZONE = 1,
  PRZEKAZANE = 2,
  ODRZUCONE = 3,
  ZAAKCEPTOWANE = 4,
  CZESCIOWO_ZREALIZOWANE = 5,
  ZREALIZOWANE = 6,
  NIE_ZREALIZOWANE = 7,
}

export const FLIGHT_ORDER_STATUS_LABELS_PL: Record<FlightOrderStatus, string> = {
  [FlightOrderStatus.WPROWADZONE]: "Wprowadzone",
  [FlightOrderStatus.PRZEKAZANE]: "Przekazane do akceptacji",
  [FlightOrderStatus.ODRZUCONE]: "Odrzucone",
  [FlightOrderStatus.ZAAKCEPTOWANE]: "Zaakceptowane",
  [FlightOrderStatus.CZESCIOWO_ZREALIZOWANE]: "Zrealizowane w części",
  [FlightOrderStatus.ZREALIZOWANE]: "Zrealizowane w całości",
  [FlightOrderStatus.NIE_ZREALIZOWANE]: "Nie zrealizowane",
};
