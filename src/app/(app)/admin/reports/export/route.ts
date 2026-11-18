import ExcelJS from "exceljs";

import { currentUser } from "@/lib/rbac";
import {
  getAdminReportsData,
  getReportPeriods,
  reportFileSlug,
  selectPeriod,
} from "@/server/queries/admin-reports";

/**
 * Excel export for /admin/reports.
 *
 * The PHP app built the workbook in the browser with SheetJS. Generating it on
 * the server keeps the spreadsheet identical for every admin, avoids shipping a
 * parsing library to the client, and works without third-party CDNs.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = [
  { header: "Teacher", key: "teacher", width: 34 },
  { header: "Evaluations", key: "evaluations", width: 14 },
  { header: "Average", key: "average", width: 12 },
  { header: "1 - Poor", key: "rating1", width: 11 },
  { header: "2 - Needs Improvement", key: "rating2", width: 23 },
  { header: "3 - Satisfactory", key: "rating3", width: 17 },
  { header: "4 - Very Satisfactory", key: "rating4", width: 22 },
  { header: "5 - Outstanding", key: "rating5", width: 17 },
];

export async function GET(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user || user.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const requestedId = Number.parseInt(
    new URL(request.url).searchParams.get("period") ?? "",
    10,
  );

  const periods = await getReportPeriods();
  const period = selectPeriod(periods, Number.isFinite(requestedId) ? requestedId : 0);
  const data = await getAdminReportsData(
    period ? { start: period.startDate, end: period.endDate } : null,
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "TVET Digital Feedback";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Sheet1");
  sheet.columns = HEADERS;

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1A3A5C" },
  };
  header.alignment = { vertical: "middle", horizontal: "center" };
  header.height = 22;

  for (const row of data.rows) {
    const added = sheet.addRow({
      teacher: row.teacherName,
      evaluations: row.totalEvaluations > 0 ? row.totalEvaluations : "—",
      average: row.averageRating !== null ? Number(row.averageRating.toFixed(2)) : "—",
      rating1: row.ratings[0],
      rating2: row.ratings[1],
      rating3: row.ratings[2],
      rating4: row.ratings[3],
      rating5: row.ratings[4],
    });

    added.getCell("evaluations").alignment = { horizontal: "center" };
    added.getCell("average").alignment = { horizontal: "center" };
    added.getCell("average").numFmt = "0.00";
    for (let column = 4; column <= 8; column += 1) {
      added.getCell(column).alignment = { horizontal: "center" };
    }
  }

  if (data.rows.length > 0) {
    sheet.autoFilter = { from: "A1", to: "H1" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Teacher_Summary_${reportFileSlug(period)}.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
