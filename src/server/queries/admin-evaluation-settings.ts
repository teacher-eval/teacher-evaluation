import { prisma } from "@/lib/db";
import { isoDateOnly, todayIso } from "@/lib/dates";

export type SettingItem = {
  id: number;
  academicYear: string;
  semester: string;
  startDate: Date;
  endDate: Date;
  startDateIso: string;
  endDateIso: string;
  isActive: boolean;
  status: "Active" | "Expired" | "Upcoming";
  statusBadgeClass: string;
  isCurrentlyRunning: boolean;
};

export type EvaluationSettingsData = {
  activeSetting: SettingItem | null;
  allSettings: SettingItem[];
};

export async function getEvaluationSettingsData(): Promise<EvaluationSettingsData> {
  const rows = await prisma.evaluationSetting.findMany({
    orderBy: { id: "desc" },
  });

  const today = todayIso();

  const allSettings: SettingItem[] = rows.map((row) => {
    const startIso = isoDateOnly(row.startDate);
    const endIso = isoDateOnly(row.endDate);

    const isRunning = row.isActive && startIso <= today && endIso >= today;

    let status: "Active" | "Expired" | "Upcoming";
    let statusBadgeClass: string;

    if (isRunning) {
      status = "Active";
      statusBadgeClass = "badge badge-success";
    } else if (endIso < today) {
      status = "Expired";
      statusBadgeClass = "badge badge-neutral";
    } else {
      status = "Upcoming";
      statusBadgeClass = "badge badge-warning";
    }

    return {
      id: row.id,
      academicYear: row.academicYear,
      semester: row.semester,
      startDate: row.startDate,
      endDate: row.endDate,
      startDateIso: startIso,
      endDateIso: endIso,
      isActive: row.isActive,
      status,
      statusBadgeClass,
      isCurrentlyRunning: isRunning,
    };
  });

  const activeSetting = allSettings.find((s) => s.isActive) ?? null;

  return {
    activeSetting,
    allSettings,
  };
}
