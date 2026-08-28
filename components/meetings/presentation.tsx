"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Pause,
  Play,
  Square,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  createActionItemAction,
  createDecisionAction,
  endMeetingAction,
  resolveBlockerAction,
  resolveSupportAction,
  startMeetingAction,
  updateLiveStateAction,
} from "@/app/actions/work";
import { ProgressBar } from "@/components/work-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PresentationMode, SlideType } from "@/types";

type Member = {
  user: { id: string; name: string; jobTitle?: string; avatar?: string };
  summary: { progress: number; completed: number; inProgress: number; blocked: number; atRisk: number };
  completedItems: string[];
  inProgress: Array<{
    id: string;
    title: string;
    progress: number;
    status: string;
    projectId?: { name?: string };
    deliverableId?: { name?: string };
  }>;
  nextActions: string[];
  support: Array<{
    id: string;
    title: string;
    blocker?: string;
    supportDescription?: string;
    status: string;
    projectId?: { name?: string };
  }>;
  talkingPoints: string[];
  tasks: Array<{
    id?: string;
    title?: string;
    progress?: number;
    actionsTaken?: string[];
    nextAction?: string;
    nextActions?: string[];
    supportDescription?: string;
    blocker?: string;
    projectId?: { name?: string; progress?: number };
    deliverableId?: { name?: string };
  }>;
};

type PresentationData = {
  meeting: {
    id: string;
    title: string;
    date: string;
    status: string;
    liveState?: { currentSlideIndex?: number; isPaused?: boolean; currentPresenterId?: string };
  };
  slides: Array<{ type: SlideType; userId?: string; label: string; section: string }>;
  members: Member[];
  projects: Array<{ id: string; name: string; progress: number; color?: string }>;
  summary: {
    progress: number;
    completed: number;
    inProgress: number;
    blocked: number;
    atRisk: number;
  };
  support: Array<{ id: string; description: string; status: string; requestedBy?: { name?: string } }>;
  decisions: Array<{ id: string; title: string; decision: string; ownerId?: { name?: string } }>;
  actionTasks: Array<{ id: string; title: string; assignedTo?: { name?: string }; dueDate?: string }>;
};

function memberFor(data: PresentationData, userId?: string) {
  return data.members.find((member) => member.user.id === userId);
}

function SlideFrame({ children, kicker, title }: { children: React.ReactNode; kicker: string; title: string }) {
  return (
    <div className="flex h-full flex-col justify-center px-[6vw] py-[5vh]">
      <p className="text-sm font-semibold tracking-[0.28em] text-sky-300 uppercase">{kicker}</p>
      <h1 className="mt-3 max-w-5xl text-5xl leading-tight font-semibold tracking-tight text-white xl:text-6xl">
        {title}
      </h1>
      <div className="mt-10">{children}</div>
    </div>
  );
}

function OverviewSlide({ data }: { data: PresentationData }) {
  return (
    <SlideFrame kicker="TBB Africa · 5-minute owner brief-outs" title={data.meeting.title}>
      <div className="flex items-end gap-10">
        <div>
          <p className="text-8xl font-semibold tabular-nums text-white">{data.summary.progress}%</p>
          <p className="mt-2 text-lg text-white/60">Overall team progress</p>
        </div>
        <div className="grid flex-1 grid-cols-4 gap-4">
          {[
            ["Completed", data.summary.completed],
            ["In Progress", data.summary.inProgress],
            ["At Risk", data.summary.atRisk],
            ["Blocked", data.summary.blocked],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-white/6 px-5 py-4 ring-1 ring-white/10">
              <p className="text-3xl font-semibold text-white">{value}</p>
              <p className="text-sm text-white/55">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {data.projects.map((project) => (
          <div key={project.id} className="rounded-2xl bg-white/6 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-medium text-white">{project.name}</p>
              <p className="text-2xl font-semibold text-white">{project.progress}%</p>
            </div>
            <ProgressBar
              value={project.progress}
              className="mt-4 h-2.5 bg-white/10"
              indicatorClassName="bg-sky-400"
            />
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function BriefSlide({ member }: { member: Member }) {
  const goals = member.tasks.filter((task) => task.title);
  return (
    <SlideFrame kicker={`${member.user.name} · 5-minute brief-out`} title="Goals and deliverables">
      <div className="grid max-h-[62vh] gap-3 overflow-y-auto pr-2 xl:grid-cols-2">
        {goals.map((task) => (
          <div key={task.id ?? task.title} className="rounded-2xl bg-white/6 p-4 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-wide text-sky-300 uppercase">
                  {task.projectId?.name} · {task.deliverableId?.name}
                </p>
                <p className="mt-1 text-xl font-medium text-white">{task.title}</p>
              </div>
              <p className="text-2xl font-semibold text-white">{task.progress ?? 0}%</p>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-white/80 md:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-white/45 uppercase">Taken</p>
                <p>{((task.actionsTaken ?? []).join(" · ")) || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-white/45 uppercase">Planned</p>
                <p>
                  {(task.nextActions?.length
                    ? task.nextActions
                    : task.nextAction
                      ? [task.nextAction]
                      : []
                  ).join(" · ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wide text-white/45 uppercase">Support</p>
                <p>{task.blocker || task.supportDescription || "N/A"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function MemberOverviewSlide({ member }: { member: Member }) {
  const projects = Array.from(
    new Map(
      member.tasks
        .map((task) => task.projectId)
        .filter(Boolean)
        .map((project) => [project!.name, project!]),
    ).values(),
  );
  return (
    <SlideFrame kicker={member.user.jobTitle || "Team member"} title={member.user.name}>
      <p className="text-xl text-white/60">{projects.map((project) => project.name).join(" + ")}</p>
      <div className="mt-10 flex items-end gap-12">
        <div>
          <p className="text-8xl font-semibold text-white">{member.summary.progress}%</p>
          <p className="text-lg text-white/55">Overall progress</p>
        </div>
        <div className="grid flex-1 gap-5">
          {projects.map((project) => (
            <div key={project.name}>
              <div className="mb-2 flex justify-between text-xl text-white">
                <span>{project.name}</span>
                <span>{project.progress ?? 0}%</span>
              </div>
              <ProgressBar value={project.progress ?? 0} className="h-3 bg-white/10" indicatorClassName="bg-sky-400" />
            </div>
          ))}
        </div>
      </div>
    </SlideFrame>
  );
}

function ListSlide({
  kicker,
  title,
  items,
  empty,
}: {
  kicker: string;
  title: string;
  items: string[];
  empty: string;
}) {
  return (
    <SlideFrame kicker={kicker} title={title}>
      {items.length === 0 ? (
        <p className="text-2xl text-white/50">{empty}</p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-4 text-3xl text-white">
              <span className="mt-2 size-3 shrink-0 rounded-full bg-emerald-400" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </SlideFrame>
  );
}

function ProgressSlide({ member }: { member: Member }) {
  return (
    <SlideFrame kicker={member.user.name} title="Currently in progress">
      <div className="grid gap-5">
        {member.inProgress.map((task) => (
          <div key={task.id} className="rounded-2xl bg-white/6 p-5 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm tracking-wide text-sky-300 uppercase">
                  {(task.projectId as { name?: string } | undefined)?.name} · {(task.deliverableId as { name?: string } | undefined)?.name}
                </p>
                <p className="mt-1 text-3xl font-medium text-white">{task.title}</p>
              </div>
              <p className="text-3xl font-semibold text-white">{task.progress}%</p>
            </div>
            <ProgressBar value={task.progress} className="mt-4 h-3 bg-white/10" indicatorClassName="bg-sky-400" />
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

function SupportSlide({ member }: { member: Member }) {
  return (
    <SlideFrame kicker={member.user.name} title="Needs team / leadership input">
      <div className="grid gap-4">
        {member.support.length === 0 ? (
          <p className="text-2xl text-white/50">No open support items.</p>
        ) : (
          member.support.map((item) => {
            const tone =
              item.status === "BLOCKED" ? "bg-red-500/20 ring-red-400/40" : "bg-amber-500/15 ring-amber-300/30";
            return (
              <div key={item.id} className={`rounded-2xl p-5 ring-1 ${tone}`}>
                <p className="text-sm tracking-wide text-white/60 uppercase">
                  {(item.projectId as { name?: string } | undefined)?.name}
                </p>
                <p className="mt-1 text-3xl font-medium text-white">{item.title}</p>
                <p className="mt-3 text-xl text-white/80">{item.blocker || item.supportDescription}</p>
              </div>
            );
          })
        )}
      </div>
    </SlideFrame>
  );
}

function DecisionsSlide({ data }: { data: PresentationData }) {
  return (
    <SlideFrame kicker="Meeting" title="Decisions">
      {data.decisions.length === 0 ? (
        <p className="text-2xl text-white/50">No decisions recorded yet.</p>
      ) : (
        <div className="grid gap-4">
          {data.decisions.map((item) => (
            <div key={item.id} className="rounded-2xl bg-white/6 p-5 ring-1 ring-white/10">
              <p className="text-3xl font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xl text-white/75">{item.decision}</p>
              <p className="mt-3 text-sm text-white/50">Owner: {item.ownerId?.name ?? "Unassigned"}</p>
            </div>
          ))}
        </div>
      )}
    </SlideFrame>
  );
}

function ActionsSlide({ data }: { data: PresentationData }) {
  return (
    <SlideFrame kicker="Meeting" title="Action items">
      {data.actionTasks.length === 0 ? (
        <p className="text-2xl text-white/50">No action items yet.</p>
      ) : (
        <ul className="space-y-4">
          {data.actionTasks.map((item) => (
            <li key={item.id} className="text-3xl text-white">
              {item.title}
              <span className="ml-3 text-xl text-white/50">{item.assignedTo?.name}</span>
            </li>
          ))}
        </ul>
      )}
    </SlideFrame>
  );
}

function SummarySlide({ data }: { data: PresentationData }) {
  return (
    <SlideFrame kicker="Meeting summary" title={data.meeting.title}>
      <div className="grid grid-cols-4 gap-4">
        {[
          ["Progress", `${data.summary.progress}%`],
          ["Decisions", data.decisions.length],
          ["Action items", data.actionTasks.length],
          ["Open support", data.support.length],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl bg-white/6 p-5 ring-1 ring-white/10">
            <p className="text-4xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-white/55">{label}</p>
          </div>
        ))}
      </div>
    </SlideFrame>
  );
}

export function PresentationDeck({
  data,
  mode,
  canHost,
  projects,
}: {
  data: PresentationData;
  mode: PresentationMode;
  canHost: boolean;
  projects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(data.meeting.liveState?.currentSlideIndex ?? 0);
  const [paused, setPaused] = useState(Boolean(data.meeting.liveState?.isPaused));
  const [pending, startTransition] = useTransition();
  const slide = data.slides[index] ?? data.slides[0];
  const member = memberFor(data, slide?.userId);
  const currentPresenter = member?.user.name ?? "Team";

  const sync = useCallback(
    async (nextIndex: number, extra?: { isPaused?: boolean }) => {
      setIndex(nextIndex);
      if (mode !== "host") return;
      const presenterId = data.slides[nextIndex]?.userId;
      await updateLiveStateAction(data.meeting.id, {
        currentSlideIndex: nextIndex,
        currentPresenterId: presenterId,
        ...extra,
      });
    },
    [data.meeting.id, data.slides, mode],
  );

  useEffect(() => {
    if (mode === "host") return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/meetings/${data.meeting.id}/live`, { cache: "no-store" });
      if (!response.ok) return;
      const live = await response.json();
      if (typeof live.liveState?.currentSlideIndex === "number") {
        setIndex(live.liveState.currentSlideIndex);
      }
      setPaused(Boolean(live.liveState?.isPaused));
    }, 1500);
    return () => window.clearInterval(timer);
  }, [data.meeting.id, mode]);

  useEffect(() => {
    if (mode !== "host") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") void sync(Math.min(data.slides.length - 1, index + 1));
      if (event.key === "ArrowLeft") void sync(Math.max(0, index - 1));
      if (event.key === " ") {
        event.preventDefault();
        setPaused((value) => {
          const next = !value;
          void updateLiveStateAction(data.meeting.id, { isPaused: next });
          return next;
        });
      }
      if (event.key.toLowerCase() === "f") {
        void document.documentElement.requestFullscreen?.();
      }
      if (event.key === "Escape") {
        void document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data.meeting.id, data.slides.length, index, mode, sync]);

  const people = useMemo(
    () => data.members.map((item) => ({ id: item.user.id, name: item.user.name })),
    [data.members],
  );

  function renderSlide() {
    if (slide.type === "overview") return <OverviewSlide data={data} />;
    if (!member && slide.userId) return <OverviewSlide data={data} />;
    if (slide.type === "member-overview" && member) return <MemberOverviewSlide member={member} />;
    if (slide.type === "member-brief" && member) return <BriefSlide member={member} />;
    if (slide.type === "member-completed" && member) {
      return (
        <ListSlide
          kicker={`${member.user.name} · Completed`}
          title="Completed work"
          items={member.completedItems}
          empty="No completed work since the last meeting."
        />
      );
    }
    if (slide.type === "member-progress" && member) return <ProgressSlide member={member} />;
    if (slide.type === "member-next" && member) {
      return (
        <ListSlide
          kicker={`${member.user.name} · Next`}
          title="Before next meeting"
          items={member.nextActions}
          empty="No next actions captured yet."
        />
      );
    }
    if (slide.type === "member-support" && member) return <SupportSlide member={member} />;
    if (slide.type === "decisions") return <DecisionsSlide data={data} />;
    if (slide.type === "action-items") return <ActionsSlide data={data} />;
    return <SummarySlide data={data} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#08111f] text-white">
      <div className={`${mode === "presenter" ? "w-[68%]" : "flex-1"} relative`}>
        {data.meeting.status === "LIVE" ? (
          <div className="absolute top-6 left-8 z-10 flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-200 ring-1 ring-red-400/40">
            <span className="size-2 animate-pulse rounded-full bg-red-400" />
            LIVE
          </div>
        ) : (
          <div className="absolute top-6 left-8 z-10 rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
            {data.meeting.status}
          </div>
        )}
        <div className={`h-[calc(100%-72px)] ${paused ? "opacity-70" : ""}`}>{renderSlide()}</div>
        <div className="absolute inset-x-0 bottom-0 flex h-[72px] items-center justify-between border-t border-white/10 bg-black/30 px-6">
          <div className="flex items-center gap-3 text-sm text-white/70">
            <Users className="size-4" />
            {index + 1} / {data.slides.length}
            <span className="text-white/30">·</span>
            Current presenter: <span className="text-white">{currentPresenter}</span>
          </div>
          {mode === "host" && canHost ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-white" onClick={() => void sync(Math.max(0, index - 1))}>
                <ChevronLeft /> Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white"
                onClick={() => void sync(Math.min(data.slides.length - 1, index + 1))}
              >
                Next <ChevronRight />
              </Button>
              <select
                className="h-8 rounded-md border border-white/15 bg-white/5 px-2 text-xs"
                value={slide.userId ?? slide.section}
                onChange={(event) => {
                  const next = data.slides.findIndex(
                    (item) => item.userId === event.target.value || item.section === event.target.value,
                  );
                  if (next >= 0) void sync(next);
                }}
              >
                <option value="overview">Team Overview</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
                <option value="decisions">Decisions</option>
                <option value="actions">Action Items</option>
                <option value="summary">Summary</option>
              </select>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white"
                onClick={() => {
                  const next = !paused;
                  setPaused(next);
                  void updateLiveStateAction(data.meeting.id, { isPaused: next });
                }}
              >
                {paused ? <Play /> : <Pause />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white"
                onClick={() => void document.documentElement.requestFullscreen?.()}
              >
                <Maximize />
              </Button>
              {data.meeting.status !== "LIVE" ? (
                <Button
                  size="sm"
                  onClick={() =>
                    startTransition(async () => {
                      await startMeetingAction(data.meeting.id);
                      toast.success("Meeting is live");
                      router.refresh();
                    })
                  }
                >
                  Start meeting
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("End this meeting and generate the summary?")) return;
                    startTransition(async () => {
                      await endMeetingAction(data.meeting.id);
                      router.push(`/meetings/${data.meeting.id}`);
                    });
                  }}
                >
                  <Square className="size-3.5" /> End meeting
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-white/50">Audience view · updates automatically</p>
          )}
        </div>
      </div>
      {mode === "presenter" ? (
        <aside className="w-[32%] border-l border-white/10 bg-[#0c1730] p-6">
          <p className="text-xs tracking-[0.2em] text-sky-300 uppercase">Presenter notes</p>
          <h2 className="mt-2 text-2xl font-semibold">{member?.user.name ?? "Team overview"}</h2>
          <ul className="mt-6 space-y-3 text-sm text-white/80">
            {(member?.talkingPoints.length ? member.talkingPoints : ["Walk through completed work", "Call out blockers", "Confirm next actions"]).map(
              (point) => (
                <li key={point} className="rounded-xl bg-white/5 p-3">
                  {point}
                </li>
              ),
            )}
          </ul>
        </aside>
      ) : null}
      {mode === "host" && canHost ? (
        <aside className="hidden w-80 overflow-y-auto border-l border-white/10 bg-[#0c1730] p-4 xl:block">
          <p className="text-xs tracking-[0.2em] text-sky-300 uppercase">Host tools</p>
          <form
            className="mt-4 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              startTransition(async () => {
                await createDecisionAction({
                  meetingId: data.meeting.id,
                  title: String(form.get("title")),
                  decision: String(form.get("decision")),
                  ownerId: String(form.get("ownerId") || ""),
                });
                toast.success("Decision recorded");
                router.refresh();
              });
            }}
          >
            <p className="text-sm font-medium">Record decision</p>
            <Input name="title" placeholder="Decision title" className="bg-white/5 text-white" />
            <Textarea name="decision" placeholder="What was decided?" className="bg-white/5 text-white" />
            <select name="ownerId" className="h-8 w-full rounded-md border border-white/15 bg-white/5 px-2 text-xs">
              <option value="">Owner</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" className="w-full">
              Save decision
            </Button>
          </form>
          <form
            className="mt-6 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              startTransition(async () => {
                const result = await createActionItemAction({
                  meetingId: data.meeting.id,
                  title: String(form.get("title")),
                  ownerId: String(form.get("ownerId")),
                  projectId: String(form.get("projectId")),
                  dueDate: String(form.get("dueDate") || ""),
                });
                if (result && "error" in result && result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Action item created");
                router.refresh();
              });
            }}
          >
            <p className="text-sm font-medium">New action item</p>
            <Input name="title" placeholder="Action title" className="bg-white/5 text-white" required />
            <select name="ownerId" className="h-8 w-full rounded-md border border-white/15 bg-white/5 px-2 text-xs" required>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <select name="projectId" className="h-8 w-full rounded-md border border-white/15 bg-white/5 px-2 text-xs" required>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <Input name="dueDate" type="date" className="bg-white/5 text-white" />
            <Button type="submit" size="sm" className="w-full">
              Create task
            </Button>
          </form>
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium">Resolve support</p>
            {data.support.map((item) => (
              <form
                key={item.id}
                className="rounded-lg bg-white/5 p-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  startTransition(async () => {
                    await resolveSupportAction(
                      item.id,
                      String(form.get("resolution") || "Resolved during meeting."),
                      data.meeting.id,
                    );
                    toast.success("Support resolved");
                    router.refresh();
                  });
                }}
              >
                <p className="text-xs text-white/70">{item.description}</p>
                <Input name="resolution" placeholder="Resolution" className="mt-2 bg-white/5 text-white" />
                <Button type="submit" size="sm" variant="secondary" className="mt-2 w-full">
                  Resolve
                </Button>
              </form>
            ))}
            {member?.support.map((item) =>
              item.blocker ? (
                <Button
                  key={`b-${item.id}`}
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    startTransition(async () => {
                      await resolveBlockerAction(item.id, "Resolved during meeting.", data.meeting.id);
                      toast.success("Blocker resolved");
                      router.refresh();
                    })
                  }
                >
                  Resolve blocker: {item.title}
                </Button>
              ) : null,
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
