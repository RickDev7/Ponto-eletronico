export interface AuditViolationRow {
  id: string;
  checkInId: string;
  type: "gps_missing" | "outside_radius";
  distance?: number;
  employee: string;
  taskTitle: string;
  taskId: string | null;
  checkInAt: string;
  addressLabel: string;
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Build GPS/radius violation rows from check-in records. */
export function buildAuditViolations(checkIns: unknown[]): AuditViolationRow[] {
  return (checkIns ?? []).flatMap((raw) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ci = raw as any;
    const task = Array.isArray(ci.task) ? ci.task[0] : ci.task;
    const address = Array.isArray(task?.address) ? task.address[0] : task?.address;
    const employee = Array.isArray(ci.employee) ? ci.employee[0] : ci.employee;

    const base = {
      checkInId: ci.id as string,
      employee: employee?.full_name ?? "—",
      taskTitle: task?.title ?? "—",
      taskId: (task?.id as string | undefined) ?? null,
      checkInAt: ci.check_in_at as string,
      addressLabel: address
        ? `${address.street} ${address.house_number ?? ""}, ${address.city}`.trim()
        : "—",
    };

    const hasGps = ci.check_in_latitude != null && ci.check_in_longitude != null;
    if (!hasGps) {
      return [{ ...base, id: `${ci.id}-gps`, type: "gps_missing" as const }];
    }

    if (address?.latitude != null && address?.longitude != null) {
      const distance = haversineMeters(
        ci.check_in_latitude as number,
        ci.check_in_longitude as number,
        address.latitude as number,
        address.longitude as number,
      );
      if (distance > 1000) {
        return [
          {
            ...base,
            id: `${ci.id}-distance`,
            type: "outside_radius" as const,
            distance,
          },
        ];
      }
    }
    return [];
  });
}
