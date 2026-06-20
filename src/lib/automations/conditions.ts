import type { AutomationCondition } from "@/lib/validations/automations";
import type { AutomationEventPayload } from "@/lib/automations/types";

function getNestedValue(payload: AutomationEventPayload, field: string): unknown {
  const parts = field.split(".");
  let current: unknown = payload;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function evaluateCondition(
  condition: AutomationCondition,
  payload: AutomationEventPayload,
): boolean {
  const raw = getNestedValue(payload, condition.field);

  switch (condition.operator) {
    case "empty":
      return raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0);
    case "not_empty":
      return raw != null && raw !== "" && !(Array.isArray(raw) && raw.length === 0);
    case "contains":
      return asString(raw).toLowerCase().includes(asString(condition.value).toLowerCase());
    case "eq":
      return asString(raw) === asString(condition.value);
    case "neq":
      return asString(raw) !== asString(condition.value);
    case "gt": {
      const left = asNumber(raw);
      const right = asNumber(condition.value);
      return left != null && right != null && left > right;
    }
    case "lt": {
      const left = asNumber(raw);
      const right = asNumber(condition.value);
      return left != null && right != null && left < right;
    }
    default:
      return true;
  }
}

export function evaluateConditions(
  conditions: AutomationCondition[],
  payload: AutomationEventPayload,
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, payload));
}
