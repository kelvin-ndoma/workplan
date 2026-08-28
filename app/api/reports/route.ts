import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { canViewAllWork } from "@/lib/permissions";
import { buildCsv, buildDocx, buildPdf, getReportData, type ReportKind } from "@/lib/reports";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const kind = (url.searchParams.get("kind") ?? "individual") as ReportKind;
  const month = url.searchParams.get("month") ?? "";
  const format = url.searchParams.get("format") ?? "docx";
  const userId = url.searchParams.get("userId") ?? undefined;
  const projectId = url.searchParams.get("projectId") ?? undefined;
  const meetingId = url.searchParams.get("meetingId") ?? undefined;

  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  if (!canViewAllWork(user) && userId && userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getReportData({
    kind,
    month,
    userId: canViewAllWork(user) ? userId : user.id,
    projectId,
    meetingId,
  });

  const base = `workplan-${kind}-${month}`;

  if (format === "csv") {
    return new NextResponse(buildCsv(data), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await buildPdf(data);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
      },
    });
  }

  const buffer = await buildDocx(data);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${base}.docx"`,
    },
  });
}
