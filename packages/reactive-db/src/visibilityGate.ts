export type ChangeDecision = "refetch" | "defer";
export type ShowDecision = "refetch" | "idle";

export interface VisibilityGate {
  recordChange(isVisible: boolean): ChangeDecision;
  recordVisible(): ShowDecision;
}

export function createVisibilityGate(): VisibilityGate {
  let deferred = false;

  return {
    recordChange(isVisible) {
      if (isVisible) return "refetch";
      deferred = true;
      return "defer";
    },
    recordVisible() {
      if (!deferred) return "idle";
      deferred = false;
      return "refetch";
    },
  };
}
