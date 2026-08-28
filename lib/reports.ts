import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, HeadingLevel, BorderStyle } from "docx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { connectDB } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { formatMonthLabel } from "@/lib/dates";
import { summarizeTasks } from "@/lib/queries";
import { Activity, Meeting, Project, Task, User } from "@/models";

export type ReportKind =
  | "individual"
  | "team"
  | "project"
  | "weekly"
  | "meeting"
  | "leadership";

type ReportRow = {
  person: string;
  project: string;
  deliverable: string;
  actionsTaken: string;
  planned: string;
  support: string;
  progress: string;
};

export async function getReportData(options: {
  kind: ReportKind;
  month: string;
  userId?: string;
  projectId?: string;
  meetingId?: string;
}) {
  await connectDB();
  const filter: Record<string, unknown> = { workPlanMonth: options.month };
  if (options.userId) filter.assignedTo = options.userId;
  if (options.projectId) filter.projectId = options.projectId;

  const [tasks, users, projects, meeting] = await Promise.all([
    Task.find(filter)
      .populate("assignedTo", "name jobTitle")
      .populate("projectId", "name")
      .populate("deliverableId", "name")
      .sort({ assignedTo: 1, title: 1 })
      .lean(),
    User.find({ isActive: true }).sort({ name: 1 }).lean(),
    Project.find({ status: { $ne: "ARCHIVED" } }).lean(),
    options.meetingId
      ? Meeting.findById(options.meetingId).populate("participantIds", "name").lean()
      : null,
  ]);

  const serialized = serialize(tasks) as Array<Record<string, unknown>>;
  const rows: ReportRow[] = serialized.map((task) => {
    const person = (task.assignedTo as { name?: string } | undefined)?.name ?? "Unassigned";
    const project = (task.projectId as { name?: string } | undefined)?.name ?? "";
    const deliverable = (task.deliverableId as { name?: string } | undefined)?.name ?? String(task.title);
    return {
      person,
      project,
      deliverable,
      actionsTaken: ((task.actionsTaken as string[]) ?? []).map((item) => `• ${item}`).join("\n"),
      planned: ((task.nextActions as string[]) ?? (task.nextAction ? [String(task.nextAction)] : []))
        .map((item) => `• ${item}`)
        .join("\n"),
      support: [task.supportDescription, task.blocker].filter(Boolean).join("\n") || "—",
      progress: `${task.progress ?? 0}%`,
    };
  });

  let activities: unknown[] = [];
  if (options.kind === "weekly" || options.kind === "meeting") {
    activities = await Activity.find({
      taskId: { $in: serialized.map((task) => task.id) },
    })
      .sort({ createdAt: -1 })
      .limit(80)
      .populate("userId", "name")
      .lean();
  }

  return {
    month: options.month,
    label: formatMonthLabel(options.month),
    kind: options.kind,
    rows,
    summary: summarizeTasks(serialized),
    users: serialize(users),
    projects: serialize(projects),
    meeting: serialize(meeting),
    activities: serialize(activities),
    tasks: serialized,
  };
}

function thinBorder() {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color: "D0D5DD" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D5DD" },
    left: { style: BorderStyle.SINGLE, size: 4, color: "D0D5DD" },
    right: { style: BorderStyle.SINGLE, size: 4, color: "D0D5DD" },
  };
}

function cell(text: string, width: number, bold = false) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: thinBorder(),
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: text.split("\n").map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line || " ", font: "Calibri", size: 18, bold })],
        }),
    ),
  });
}

export async function buildDocx(data: Awaited<ReturnType<typeof getReportData>>) {
  const grouped = new Map<string, ReportRow[]>();
  for (const row of data.rows) {
    const list = grouped.get(row.person) ?? [];
    list.push(row);
    grouped.set(row.person, list);
  }

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
          children: [new TextRun({ text: "TBB Africa — Team Meeting Brief-Out", font: "Calibri", bold: true })],
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `TBB Africa · The Burns Brothers · ${data.label} · ${data.kind.replace("-", " ")}`,
          font: "Calibri",
          size: 22,
          color: "475467",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Overall progress ${data.summary.progress}%  ·  ${data.summary.completed} completed  ·  ${data.summary.inProgress} in progress  ·  ${data.summary.blocked} blocked  ·  ${data.summary.atRisk} at risk`,
          font: "Calibri",
          size: 20,
        }),
      ],
    }),
  ];

  for (const [person, rows] of grouped) {
    const projects = Array.from(new Set(rows.map((row) => row.project))).join(" + ");
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280 },
        children: [new TextRun({ text: person.toUpperCase(), font: "Calibri", bold: true })],
      }),
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: projects, font: "Calibri", italics: true, color: "344054" })],
      }),
    );

    children.push(
      new Table({
        width: { size: 10080, type: WidthType.DXA },
        columnWidths: [2200, 2300, 2300, 1880, 1400],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              cell("Goal / Deliverable", 2200, true),
              cell("Actions Taken Since Last Meeting", 2300, true),
              cell("Actions Planned Before Next Meeting", 2300, true),
              cell("Support Needed", 1880, true),
              cell("% Complete", 1400, true),
            ],
          }),
          ...rows.map(
            (row) =>
              new TableRow({
                children: [
                  cell(row.deliverable, 2200),
                  cell(row.actionsTaken || "—", 2300),
                  cell(row.planned || "—", 2300),
                  cell(row.support, 1880),
                  cell(row.progress, 1400),
                ],
              }),
          ),
        ],
      }),
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

export async function buildPdf(data: Awaited<ReturnType<typeof getReportData>>) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TBB Africa — Team Meeting Brief-Out", 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70);
  doc.text(`TBB Africa · The Burns Brothers · ${data.label} · ${data.kind}`, 40, 60);
  doc.text(
    `Overall progress ${data.summary.progress}%   Completed ${data.summary.completed}   In progress ${data.summary.inProgress}   Blocked ${data.summary.blocked}   At risk ${data.summary.atRisk}`,
    40,
    78,
  );

  autoTable(doc, {
    startY: 96,
    head: [["Person", "Goal / Deliverable", "Actions Taken", "Planned", "Support Needed", "%"]],
    body: data.rows.map((row) => [
      row.person,
      `${row.project}\n${row.deliverable}`,
      row.actionsTaken,
      row.planned,
      row.support,
      row.progress,
    ]),
    styles: { fontSize: 8, cellPadding: 6, valign: "top" },
    headStyles: { fillColor: [30, 58, 95], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 90 },
      5: { cellWidth: 50, halign: "center" },
    },
  });

  return Buffer.from(doc.output("arraybuffer"));
}

export function buildCsv(data: Awaited<ReturnType<typeof getReportData>>) {
  const header = [
    "Person",
    "Project",
    "Goal / Deliverable",
    "Actions Taken Since Last Meeting",
    "Actions Planned Before Next Meeting",
    "Support Needed",
    "% Complete",
  ];
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const lines = [
    header.join(","),
    ...data.rows.map((row) =>
      [row.person, row.project, row.deliverable, row.actionsTaken, row.planned, row.support, row.progress]
        .map(escape)
        .join(","),
    ),
  ];
  return lines.join("\n");
}
