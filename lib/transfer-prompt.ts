export const TRANSFER_ACCEPT_PROMPT = `Update WorkPlan CSV/JSON upload so it accepts the latest-work file from the other WorkPlan.

Required (keep working as today):
- project — existing project name (match case-insensitive, do not create a duplicate if the project already exists)
- title — task / deliverable name
- assignees — who owns it; match roster by full email first, then key, then name. They do not need to have accepted the invite. Multiple people: split on ; , or |

Also read and save these optional fields onto the matched task (create the task under that project if it is new; update if the same person already has this title on that project):
- description (aliases: details, notes, body) — full task write-up; store on the task, not only the title
- deliverable — parent deliverable name on the project; create the deliverable if missing, then attach the task
- status — NOT_STARTED | IN_PROGRESS | AT_RISK | BLOCKED | COMPLETED | CANCELLED
- progress — 0–100 number
- priority — LOW | MEDIUM | HIGH | CRITICAL
- month (aliases: work_plan_month, workPlanMonth) — YYYY-MM
- next_action (aliases: next_actions, nextAction) — planned next step; if several, split on | or newlines
- actions_taken (aliases: actionsTaken) — work already done; split on | or newlines
- support (aliases: support_description) — help needed
- blocker — current blocker
- due_date (aliases: dueDate) — ISO date if present

CSV header row:
project,title,assignees,description,deliverable,status,progress,priority,month,next_action,actions_taken,support,blocker,due_date

JSON shape:
{ "rows": [ { "project": "CEAI", "title": "Institute Structure", "assignees": ["mike@theburnsbrothers.com"], "description": "…", "deliverable": "Institute Structure", "status": "IN_PROGRESS", "progress": 40, "priority": "MEDIUM", "month": "2026-09", "next_action": "…", "actions_taken": ["…"], "support": "", "blocker": "", "due_date": null } ] }

Do not ignore description. Show it on the task. Match projects by name and merge deliverables/tasks; do not wipe existing projects.`;
