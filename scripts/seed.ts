import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { subDays } from "date-fns";
import { connectDB } from "../lib/db";
import { recalculateProgress } from "../lib/services/progress";
import {
  Activity,
  AuditLog,
  Comment,
  Decision,
  Deliverable,
  Department,
  Meeting,
  Notification,
  Project,
  SupportRequest,
  Task,
  User,
} from "../models";
import type { TaskStatus } from "../types";

const PASSWORD = "WorkPlan2026!";
const MONTH = "2026-08";

type OwnerKey = "mike" | "john" | "will" | "london" | "drew" | "kuyu" | "kelvin";

type Goal = {
  owner: OwnerKey;
  project: string;
  workstream: string;
  title: string;
  actionsTaken: string[];
  nextActions: string[];
  support: string;
  progress: number;
  status?: TaskStatus;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  weight?: number;
};

function inferStatus(goal: Goal): TaskStatus {
  if (goal.status) return goal.status;
  if (goal.progress >= 100) return "COMPLETED";
  if (goal.progress === 0 && /waiting|have not|not yet|nil/i.test([...goal.actionsTaken, goal.support].join(" "))) {
    return /waiting/i.test(goal.actionsTaken.join(" ") + goal.support) ? "BLOCKED" : "NOT_STARTED";
  }
  if (/impasses|blocked|await/i.test(goal.support) && goal.progress < 40) return "AT_RISK";
  return "IN_PROGRESS";
}

const GOALS: Goal[] = [
  // MIKE — CEAI + HQ Kenya House
  {
    owner: "mike",
    project: "CEAI",
    workstream: "CEAI — Institutional Architecture & Governance",
    title: "Institute Structure",
    actionsTaken: [
      "Master document drafted.",
      "Sent out for review to John, Dos, London, Rosemary, and Dr M.",
    ],
    nextActions: ["Finalize by next meeting after collecting remaining teammate input."],
    support: "Feedback from teammates",
    progress: 85,
  },
  {
    owner: "mike",
    project: "CEAI",
    workstream: "CEAI — Institutional Architecture & Governance",
    title: "Board Requirements",
    actionsTaken: ["Initial board role and responsibility document designed and sent to London for review."],
    nextActions: ["Await Dr. London’s feedback and finalize roles and responsibilities."],
    support: "Feedback from Dr. Moore",
    progress: 70,
  },
  {
    owner: "mike",
    project: "CEAI",
    workstream: "CEAI — Institutional Architecture & Governance",
    title: "Founding Partner Requirements",
    actionsTaken: ["Initial partner role and responsibility document designed and sent to London for review."],
    nextActions: ["Await Dr. London’s feedback and finalize roles and responsibilities."],
    support: "Feedback from Dr. Moore",
    progress: 70,
  },
  {
    owner: "mike",
    project: "CEAI",
    workstream: "CEAI — Recruitment, Marketing & Pipeline",
    title: "Board Marketing Tools",
    actionsTaken: ["Have not yet actioned. Waiting for feedback on board roles and responsibilities."],
    nextActions: ["Plan to have first draft done by Tuesday."],
    support: "N/A",
    progress: 0,
    status: "BLOCKED",
  },
  {
    owner: "mike",
    project: "CEAI",
    workstream: "CEAI — Recruitment, Marketing & Pipeline",
    title: "Partner Marketing Tools",
    actionsTaken: ["Have not yet actioned. Waiting for feedback on board roles and responsibilities."],
    nextActions: ["Plan to have first draft done by Tuesday."],
    support: "N/A",
    progress: 0,
    status: "BLOCKED",
  },
  {
    owner: "mike",
    project: "CEAI",
    workstream: "CEAI — Onboarding Systems & Experience",
    title: "Board Onboarding",
    actionsTaken: ["Have not yet begun. Plan to draft first process design next week."],
    nextActions: ["Plan to have first draft done by Friday."],
    support: "N/A",
    progress: 0,
    status: "NOT_STARTED",
  },
  {
    owner: "mike",
    project: "CEAI",
    workstream: "CEAI — Onboarding Systems & Experience",
    title: "Partner Onboarding",
    actionsTaken: ["Have not yet begun. Plan to draft first process design next week."],
    nextActions: ["Plan to have first draft done by Friday."],
    support: "N/A",
    progress: 0,
    status: "NOT_STARTED",
  },
  {
    owner: "mike",
    project: "HQ Kenya House",
    workstream: "HQ Kenya House — Relaunch Strategy",
    title: "Relaunch Strategy",
    actionsTaken: [
      "Discussed private event approach with John and Will.",
      "Drew has updated the website.",
      "Now building a comprehensive relaunch strategy targeting private events the 2nd week of September.",
    ],
    nextActions: ["Send proposed detailed approach to teammates by COB Tuesday."],
    support: "Sit down and discuss in more detail with Will",
    progress: 25,
  },

  // JOHN — The ARC / Summer Series
  {
    owner: "john",
    project: "The ARC / Summer Series",
    workstream: "Preston September Event",
    title: "Event Space Contract",
    actionsTaken: ["Received updated version from Susan for final review and feedback."],
    nextActions: ["Finalize response to lock in contract by end of month."],
    support: "N/A",
    progress: 75,
  },
  {
    owner: "john",
    project: "The ARC / Summer Series",
    workstream: "Preston September Event",
    title: "Run of Show",
    actionsTaken: ["Preliminary artist confirmations for phase 1."],
    nextActions: ["Continue building partners, talent, and sponsors to prepare for ticket launch."],
    support: "N/A",
    progress: 5,
  },
  {
    owner: "john",
    project: "The ARC / Summer Series",
    workstream: "Preston September Event",
    title: "Attendee Outreach",
    actionsTaken: ["Launching end October 1."],
    nextActions: ["Continue building partners, talent, and sponsors to prepare for ticket launch."],
    support: "Working with Kuyu on sponsor outreach",
    progress: 0,
    status: "NOT_STARTED",
  },
  {
    owner: "john",
    project: "The ARC / Summer Series",
    workstream: "Summer Series Production & Infrastructure",
    title: "Production Partner",
    actionsTaken: ["Received updated version from Susan for final review and feedback."],
    nextActions: ["Finalize response to lock in contract by end of month."],
    support: "N/A",
    progress: 75,
  },
  {
    owner: "john",
    project: "The ARC / Summer Series",
    workstream: "Summer Series Production & Infrastructure",
    title: "Land Use Contract (Tatu City)",
    actionsTaken: ["Signed and good to go."],
    nextActions: [],
    support: "N/A",
    progress: 100,
    status: "COMPLETED",
  },
  {
    owner: "john",
    project: "The ARC / Summer Series",
    workstream: "Programming & Talent",
    title: "US Talent",
    actionsTaken: ["Approximately 10 preliminary confirmations for phase 1."],
    nextActions: ["Secure sponsorship dollars to lock in talent."],
    support: "N/A",
    progress: 10,
  },
  {
    owner: "john",
    project: "The ARC / Summer Series",
    workstream: "Programming & Talent",
    title: "Local Programming",
    actionsTaken: [
      "Still need to identify an East African based talent buyer.",
      "Spoke to Bien’s team.",
      "World Afrika concert is in Ethiopia the week before; working with promoters on possible talent.",
    ],
    nextActions: ["Continue local talent-buyer and promoter conversations."],
    support: "N/A",
    progress: 5,
  },
  {
    owner: "john",
    project: "The ARC / Summer Series",
    workstream: "Sponsorship",
    title: "Sponsorship Deck",
    actionsTaken: ["About 90% complete. Making tweaks as the model is refined."],
    nextActions: ["Lock One54 partnership to understand how we are selling it."],
    support: "N/A",
    progress: 90,
  },
  {
    owner: "john",
    project: "HQ Kenya House",
    workstream: "HQ Kenya House",
    title: "Sales Associate (hire)",
    actionsTaken: ["Job description has been completed."],
    nextActions: ["Launch job description."],
    support: "Will",
    progress: 10,
  },
  {
    owner: "john",
    project: "HQ Kenya House",
    workstream: "HQ Kenya House",
    title: "Arte Caffee Partnership",
    actionsTaken: ["Reached out to Sagi a few times but have not heard back."],
    nextActions: ["Get number from London to text him directly."],
    support: "London",
    progress: 0,
    status: "BLOCKED",
  },

  // WILL — HQ Kenya House + General Operations
  {
    owner: "will",
    project: "HQ Kenya House",
    workstream: "HQ Kenya House",
    title: "Sales Associate (hire)",
    actionsTaken: ["Reviewed 13 applications and narrowed list to 3 viable candidates."],
    nextActions: ["Send initial correspondence to applicants to set up interviews."],
    support: "Mike/John to review applications and concur on Will’s list",
    progress: 10,
  },
  {
    owner: "will",
    project: "HQ Kenya House",
    workstream: "HQ Kenya House",
    title: "ArtCaffe Partnership",
    actionsTaken: [
      "Contact email is out to Sagi and team for a follow-up meeting to solidify the partnership.",
      "Awaiting confirmation of dates for next week.",
    ],
    nextActions: ["Follow up with ArtCaffe if necessary and lock in meeting time."],
    support: "N/A",
    progress: 10,
  },
  {
    owner: "will",
    project: "General Operations",
    workstream: "Operational Support (cross-team)",
    title: "NCBA till number for NIA",
    actionsTaken: ["NCBA bank account new till number for NIA."],
    nextActions: ["Submit the required paperwork to Kevin at NCBA by COB Thursday."],
    support: "Fill in till paperwork",
    progress: 20,
  },
  {
    owner: "will",
    project: "General Operations",
    workstream: "Operational Support (cross-team)",
    title: "CEAI and TBBAH LTD entity formation",
    actionsTaken: [
      "Correspondence with Ronn around formation of CEAI entity and TBBAH LTD entity in partnership with Mike.",
      "Ongoing discussions with Mike and the accountant.",
    ],
    nextActions: ["Discuss the formations of both with Mike in a whiteboard session."],
    support: "Temporary pause; will clarify with Mike and accountant",
    progress: 5,
    status: "AT_RISK",
  },
  {
    owner: "will",
    project: "General Operations",
    workstream: "Operational Support (cross-team)",
    title: "SEZ and tax matters",
    actionsTaken: [
      "Correspondence with Ronn around SEZ and tax matters.",
      "Follow-on discussion with the accountant on how and what to form.",
    ],
    nextActions: ["Awaiting meeting confirmation from accountant."],
    support: "Awaiting meeting confirmation from accountant",
    progress: 5,
  },
  {
    owner: "will",
    project: "The ARC / Summer Series",
    workstream: "Operational Support (cross-team)",
    title: "TCL partnership sponsorship agreement",
    actionsTaken: ["Finalized and sent partnership sponsorship agreement with TCL. DocuSign is complete and invoice is out."],
    nextActions: ["Send reminders to finalize via DocuSign and then send deposit invoice."],
    support: "N/A",
    progress: 50,
  },
  {
    owner: "will",
    project: "Nia Sessions",
    workstream: "Operational Support (cross-team)",
    title: "NIA contracts — Pinye, Judy, and Abel",
    actionsTaken: [
      "Finalizing NIA contracts with Kuyu/Mike/John for Pinye, Judy, and Abel.",
      "Updated contracts are in DocuSign awaiting signatures.",
    ],
    nextActions: [
      "Awaiting Judy and Abel go-ahead for edits.",
      "Awaiting Mike/John review on Pinye edits to send an updated contract.",
      "John signs after Preston.",
    ],
    support: "Mike/John review on Pinye edits; Judy and Abel sign-off",
    progress: 50,
  },
  {
    owner: "will",
    project: "Nia Sessions",
    workstream: "Operational Support (cross-team)",
    title: "NIA website and Moto Tickets platform",
    actionsTaken: [
      "Working ICW with Drew and Kelvin to complete NIA website and Moto Tickets platform.",
      "Provided further guidance specific to Moto and how/when to incorporate John’s weekend feedback for follow-on phases.",
    ],
    nextActions: ["Launch conditions check; continue product guidance with Drew and Kelvin."],
    support: "Drew and Kelvin",
    progress: 50,
  },
  {
    owner: "will",
    project: "Creative Economy 101",
    workstream: "Operational Support (cross-team)",
    title: "eTims / NCBA CE 101 invoicing",
    actionsTaken: [
      "Working through eTims issues with Kelvin to update NCBA CE 101 invoice and set conditions for follow-on invoices.",
      "Currently at an impasse; current COA is to contact Novacom for access.",
    ],
    nextActions: ["Meet with Kelvin again for further workarounds."],
    support: "Kelvin; Novacom access",
    progress: 30,
    status: "BLOCKED",
  },
  {
    owner: "will",
    project: "General Operations",
    workstream: "Operational Support (cross-team)",
    title: "Toastmasters partnership",
    actionsTaken: ["Synchronized Toastmasters partnership. Sent dates for initial meeting and awaiting confirmation."],
    nextActions: ["Awaiting response from Toastmasters POC for intro meeting."],
    support: "Awaiting meeting confirmation",
    progress: 5,
  },
  {
    owner: "will",
    project: "General Operations",
    workstream: "Operational Support (cross-team)",
    title: "OneAfrica Entertainment",
    actionsTaken: [
      "Synchronized OneAfrica Entertainment.",
      "Drew completed the initial sub portion of the deck around Savor/ArtCaffe; further iterations will require treatment around 9 brands.",
    ],
    nextActions: ["Align with John and Drew."],
    support: "John and Drew",
    progress: 5,
  },

  // LONDON — CEAI + ARC/Summer Series + CE101
  {
    owner: "london",
    project: "CEAI",
    workstream: "CEAI",
    title: "Board Candidates — 8 confirmed of 15 identified",
    actionsTaken: ["TBB Africa 2026 Targeted Focus Areas.", "Update potentials list specific to KE."],
    nextActions: ["LM to connect with Kaya Henderson.", "John and Mike to meet with Danae."],
    support: "John and Mike to meet with Danae",
    progress: 20,
  },
  {
    owner: "london",
    project: "CEAI",
    workstream: "CEAI",
    title: "Founding Partners — 12 confirmed per pillar of 20 identified",
    actionsTaken: ["TBB Africa 2026 Targeted Focus Areas.", "Update potentials list specific to KE."],
    nextActions: ["Continue Kenya-specific founding partner pipeline."],
    support: "N/A",
    progress: 15,
  },
  {
    owner: "london",
    project: "The ARC / Summer Series",
    workstream: "ARC / Summer Series",
    title: "SBHM Term Sheet",
    actionsTaken: ["Connect with Sagal over the weekend on updated term sheet from thread."],
    nextActions: ["Schedule Meeting #2 for term sheet review."],
    support: "N/A",
    progress: 25,
  },
  {
    owner: "london",
    project: "The ARC / Summer Series",
    workstream: "ARC / Summer Series",
    title: "Rendeavour MOU",
    actionsTaken: ["Not yet part of Rendeavour conversations to date."],
    nextActions: ["Need a pass-over meeting with John and Mike."],
    support: "John and Mike — pass-over meeting on Rendeavour",
    progress: 0,
    status: "BLOCKED",
  },
  {
    owner: "london",
    project: "The ARC / Summer Series",
    workstream: "ARC / Summer Series",
    title: "Summer Series Brand Ambassadors",
    actionsTaken: ["Connected with Endurance — meeting scheduled 3:00–3:30pm.", "Meeting with Chiki on Bien but need agreement first."],
    nextActions: ["Complete ambassador conversations after agreement is in place."],
    support: "John on brand ambassador partnership agreement",
    progress: 20,
  },
  {
    owner: "london",
    project: "The ARC / Summer Series",
    workstream: "ARC / Summer Series",
    title: "Summer Series Partners",
    actionsTaken: ["Need to follow up with Symon Barguei, Capital Group Limited — partnership agreement."],
    nextActions: ["Follow up on Capital Group partnership agreement."],
    support: "John on media partner agreement",
    progress: 10,
  },
  {
    owner: "london",
    project: "Creative Economy 101",
    workstream: "Creative Economy 101",
    title: "DTC Sales Strategy",
    actionsTaken: [
      "Meeting with Kerry Amani on Wednesday. He will share a formal proposal by EOD Friday 21 August.",
      "CE 101 needs a hook to make the value-add clear.",
      "Updated sales list — TBB Africa 2026 Targeted Focus Areas.",
      "Connect with Ken from Adaptis — waiting on invoice from us.",
    ],
    nextActions: [
      "Connect with John/Mike on CCI license purchase.",
      "Confirm whether NCBA completed their purchase of 10.",
      "Connect with Mike on Welcome to the Institute workflow once licenses are purchased.",
    ],
    support: "Will — KRA invoicing link for Ken to purchase 100 licenses (50 Adaptis, 50 donation). Will — NCBA purchase of 10.",
    progress: 30,
  },
  {
    owner: "london",
    project: "Creative Economy 101",
    workstream: "Creative Economy 101",
    title: "Marketing Materials",
    actionsTaken: [],
    nextActions: ["Develop CE 101 marketing materials."],
    support: "N/A",
    progress: 0,
    status: "NOT_STARTED",
  },

  // DREW — Nia Sessions + Creative Support
  {
    owner: "drew",
    project: "Nia Sessions",
    workstream: "Nia Sessions",
    title: "Talent Onboarding Guide",
    actionsTaken: [
      "Researched MasterClass as to what’s standard for talent.",
      "Discussed video structure with leadership: 30 min lesson as final product.",
    ],
    nextActions: [
      "Create onboarding document structure in Word / with AI.",
      "Design onboarding documents.",
      "Social media toolkit.",
    ],
    support: "List of confirmed talent so we can offer 3 lesson options each, 1 of which the talent will choose to focus on in their video.",
    progress: 10,
  },
  {
    owner: "drew",
    project: "Nia Sessions",
    workstream: "Nia Sessions",
    title: "Needs Statement (fully operating Nia Sessions)",
    actionsTaken: [
      "Needs Statement complete and submitted to Dos; includes suggested teams and content, and a list of necessary teammates.",
    ],
    nextActions: ["Review feasibility with leadership."],
    support: "Feedback",
    progress: 75,
  },
  {
    owner: "drew",
    project: "General Operations",
    workstream: "Creative Support (cross-team)",
    title: "Creative Support (cross-team)",
    actionsTaken: ["Video completed for NIA website."],
    nextActions: [
      "Review with Kelvin.",
      "Summer Series website and social media/ad plan.",
      "Nia and Moto emails.",
      "Moto ticket Arc sections.",
    ],
    support: "Summer Series website needs to be renewed",
    progress: 40,
  },

  // KUYU — Nia Sessions + ARC/Summer Series + PR
  {
    owner: "kuyu",
    project: "Nia Sessions",
    workstream: "Nia Sessions",
    title: "September Shoots — book/calendar 6 shoots",
    actionsTaken: [
      "Working doc — list of all creators.",
      "Targeting Judy & Abel, Cepha/Kate, Viola Karuri, Kanyi Ohawa, Motif, Pinye, Tosh Gitonga for September.",
      "Will shared updated agreement with Judy & Abel; they will sign after holiday.",
      "Viola question on uniform marketing material; otherwise ready to sign.",
      "Meetings set with Reuben Odanga, Njugush, June Gachui, Eugene Mbugua, Tedd Josiah.",
    ],
    nextActions: ["Meet with Cepha (manager to Kate Actress) and Reuben."],
    support:
      "Will: share updated Judy and Abel agreements. John: support with Brenda, Pinye’s lawyer. London: Bien and Chiki progress on Nia Sessions.",
    progress: 15,
  },
  {
    owner: "kuyu",
    project: "Nia Sessions",
    workstream: "Nia Sessions",
    title: "Sponsorship Plan",
    actionsTaken: [
      "Book meeting with NCBA & Samsung (Phone Category) to discuss sponsorship of Nia Sessions.",
      "Samsung blocks external emails; working a phone intro via a former colleague. More likely to sponsor Nia Sessions.",
    ],
    nextActions: ["Secure Samsung meeting with Brenda (Head of Marketing for Mobile Experience)."],
    support: "N/A",
    progress: 0,
    status: "IN_PROGRESS",
  },
  {
    owner: "kuyu",
    project: "The ARC / Summer Series",
    workstream: "ARC / Summer Series Sponsorship",
    title: "Sponsor Identification — 5x current deck count",
    actionsTaken: ["List created by John."],
    nextActions: ["Continue expanding identified sponsors against the deck."],
    support: "N/A",
    progress: 80,
  },
  {
    owner: "kuyu",
    project: "The ARC / Summer Series",
    workstream: "ARC / Summer Series Sponsorship",
    title: "Sponsor Outreach",
    actionsTaken: [
      "Met with Roland (together with John) — EABL Head of Culture and Sponsorships.",
      "Emailed Safaricom’s Director of Brand & Marketing.",
      "Emailed Samsung Head of Marketing for Mobile Experience.",
      "Working Absa Marketing Manager — Brand intro.",
    ],
    nextActions: [
      "Secure Safaricom meeting before COB Wednesday, or find an alternative route.",
      "Secure Absa meeting.",
    ],
    support: "John: booking calendar for first meetings where possible for presence in high-stakes meetings.",
    progress: 1,
  },
  {
    owner: "kuyu",
    project: "General Operations",
    workstream: "PR Support (cross-team)",
    title: "PR Support (cross-team)",
    actionsTaken: ["Nil"],
    nextActions: ["Nil"],
    support: "None at this time",
    progress: 0,
    status: "NOT_STARTED",
  },

  // KELVIN — Nia Sessions + Moto Tickets
  {
    owner: "kelvin",
    project: "Nia Sessions",
    workstream: "Nia Sessions",
    title: "Website",
    actionsTaken: [
      "Implemented CRM Logic and UI.",
      "Implemented Admin Reports.",
      "Added official trailers and other trailers, both user and admin.",
      "Researched storage options.",
      "Started checkout flow.",
    ],
    nextActions: [
      "Present NIA website current state to leadership.",
      "Present storage options for NIA Sessions videos.",
      "Start storage implementation.",
    ],
    support: "Storage platform final decision for implementation",
    progress: 60,
    weight: 3,
    priority: "HIGH",
  },
  {
    owner: "kelvin",
    project: "Nia Sessions",
    workstream: "Nia Sessions",
    title: "Digital Marketing Strategy",
    actionsTaken: [
      "Research on strategy, content types, and content pillars.",
      "Persona identification.",
      "Research on main channels to use.",
    ],
    nextActions: [
      "Define channel strategy, content pillars, campaign structure, audience segments, launch plan, and initial advertising approach.",
      "Share initial personas, channels, and content pillars draft with Dos and Drew for review.",
    ],
    support: "Confirmation of target audience, launch priorities, and available marketing budget",
    progress: 30,
    weight: 2,
  },
  {
    owner: "kelvin",
    project: "Nia Sessions",
    workstream: "Nia Sessions",
    title: "Customer Onboarding System",
    actionsTaken: [
      "Defined the initial onboarding flow covering account creation, welcome experience, profile setup, interests and learning goals, class recommendations, and transition into the first learning experience.",
      "Drafted the Customer Onboarding Journey.",
    ],
    nextActions: [
      "Complete the onboarding journey and connect it to user profiles, course recommendations, dashboard access, and the member experience.",
      "Share the draft with the team for review and recommendations.",
    ],
    support: "Confirmation of the desired onboarding questions, membership journey, and final user experience",
    progress: 40,
    weight: 2,
  },
  {
    owner: "kelvin",
    project: "Moto Tickets",
    workstream: "Moto Tickets",
    title: "Viable Product — 80% target",
    actionsTaken: [
      "Implemented dynamic seating arrangement logic and custom venue seating layout design.",
      "Working on the revenue doc shared by John to determine priority implementation.",
    ],
    nextActions: [
      "Complete checkout logic and test booking and ticketing workflows.",
      "UI with Drew.",
      "Discuss with Will on implementation phases for the revenue engine.",
    ],
    support: "Decision on storage and pricing",
    progress: 30,
    weight: 3,
    priority: "CRITICAL",
  },
  {
    owner: "kelvin",
    project: "Moto Tickets",
    workstream: "Moto Tickets",
    title: "Needs Statement (fully operating Moto Tickets)",
    actionsTaken: ["Needs statement completed and sent to Dos."],
    nextActions: ["Prepare to brief the team after review."],
    support: "N/A",
    progress: 100,
    status: "COMPLETED",
    weight: 1,
  },
];

const PROJECTS = [
  { name: "CEAI", description: "Creative Economy Africa Institute — architecture, governance, recruitment, and onboarding.", color: "#1d4ed8" },
  { name: "HQ Kenya House", description: "Relaunch, sales, and partnerships for HQ Kenya House.", color: "#b45309" },
  { name: "The ARC / Summer Series", description: "Preston event, production, talent, and sponsorship.", color: "#7c3aed" },
  { name: "Nia Sessions", description: "Website, onboarding, talent, shoots, and membership experience.", color: "#2563eb" },
  { name: "Moto Tickets", description: "Ticketing platform, seating, checkout, and revenue engine.", color: "#dc2626" },
  { name: "Creative Economy 101", description: "DTC sales, licensing, invoicing, and marketing materials.", color: "#0f766e" },
  { name: "General Operations", description: "Cross-team operational, legal, finance, and creative support.", color: "#334155" },
];

async function seed() {
  await connectDB();
  console.log("Connected. Seeding TBB Africa August 2026 brief...");

  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Project.deleteMany({}),
    Deliverable.deleteMany({}),
    Task.deleteMany({}),
    Activity.deleteMany({}),
    SupportRequest.deleteMany({}),
    Comment.deleteMany({}),
    Meeting.deleteMany({}),
    Decision.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const mike = await User.create({
    name: "Mike",
    email: "mike@theburnsbrothers.com",
    passwordHash,
    role: "ADMIN",
    jobTitle: "Leadership — CEAI & HQ Kenya House",
    isActive: true,
  });
  const will = await User.create({
    name: "Will",
    email: "will@theburnsbrothers.com",
    passwordHash,
    role: "MANAGER",
    jobTitle: "General Operations, HQ Kenya House & Product Support",
    managerId: mike._id,
    isActive: true,
  });
  const london = await User.create({
    name: "London",
    email: "london@theburnsbrothers.com",
    passwordHash,
    role: "MANAGER",
    jobTitle: "CEAI, ARC / Summer Series & CE101",
    managerId: mike._id,
    isActive: true,
  });
  const john = await User.create({
    name: "John",
    email: "john@theburnsbrothers.com",
    passwordHash,
    role: "TEAM_MEMBER",
    jobTitle: "The ARC / Summer Series",
    managerId: will._id,
    isActive: true,
  });
  const drew = await User.create({
    name: "Drew",
    email: "drew@theburnsbrothers.com",
    passwordHash,
    role: "TEAM_MEMBER",
    jobTitle: "Nia Sessions & Creative Support",
    managerId: will._id,
    isActive: true,
  });
  const kuyu = await User.create({
    name: "Kuyu",
    email: "kuyu@theburnsbrothers.com",
    passwordHash,
    role: "TEAM_MEMBER",
    jobTitle: "Nia Sessions, ARC Sponsorship & PR",
    managerId: will._id,
    isActive: true,
  });
  const kelvin = await User.create({
    name: "Kelvin",
    email: "kelvin@theburnsbrothers.com",
    passwordHash,
    role: "ADMIN",
    jobTitle: "Nia Sessions & Moto Tickets",
    managerId: mike._id,
    isActive: true,
  });

  const owners = { mike, john, will, london, drew, kuyu, kelvin };
  const memberIds = Object.values(owners).map((user) => user._id);

  const department = await Department.create({
    name: "TBB Africa",
    description: "The Burns Brothers Africa — twice-weekly workplan and 5-minute owner brief-outs.",
    managerId: will._id,
    memberIds,
  });
  await User.updateMany({ _id: { $in: memberIds } }, { departmentId: department._id });

  const projectDocs = new Map<string, mongoose.Types.ObjectId>();
  for (const project of PROJECTS) {
    const doc = await Project.create({
      ...project,
      ownerId: will._id,
      memberIds,
      departmentId: department._id,
      status: "ACTIVE",
      priority: "HIGH",
      startDate: new Date("2026-07-01"),
      targetDate: new Date("2026-09-30"),
      progress: 0,
    });
    projectDocs.set(project.name, doc._id);
  }

  const deliverableDocs = new Map<string, mongoose.Types.ObjectId>();
  const createdTasks: Array<{ goal: Goal; id: mongoose.Types.ObjectId }> = [];

  for (const goal of GOALS) {
    const projectId = projectDocs.get(goal.project);
    if (!projectId) throw new Error(`Missing project ${goal.project}`);
    const deliverableKey = `${goal.project}::${goal.title}`;
    let deliverableId = deliverableDocs.get(deliverableKey);
    if (!deliverableId) {
      const deliverable = await Deliverable.create({
        projectId,
        name: goal.title,
        description: goal.workstream,
        ownerId: owners[goal.owner]._id,
        progress: goal.progress,
        status: goal.progress >= 100 ? "COMPLETED" : "ACTIVE",
        priority: goal.priority ?? "MEDIUM",
        startDate: new Date("2026-08-01"),
        dueDate: new Date("2026-09-15"),
      });
      deliverableId = deliverable._id as mongoose.Types.ObjectId;
      deliverableDocs.set(deliverableKey, deliverableId);
    }
    if (!deliverableId) throw new Error(`Missing deliverable ${deliverableKey}`);

    const status = inferStatus(goal);
    const supportNeeded = Boolean(goal.support && !/^n\/a$/i.test(goal.support) && !/none at this time/i.test(goal.support));
    const task = await Task.create({
      title: goal.title,
      description: goal.workstream,
      projectId,
      deliverableId,
      assignedTo: owners[goal.owner]._id,
      createdBy: will._id,
      status,
      priority: goal.priority ?? "MEDIUM",
      progress: goal.progress,
      weight: goal.weight ?? 1,
      startDate: new Date("2026-08-01"),
      dueDate: new Date("2026-09-08"),
      completedAt: status === "COMPLETED" ? new Date("2026-08-20") : undefined,
      actionsTaken: goal.actionsTaken,
      nextAction: goal.nextActions[0] ?? "",
      nextActions: goal.nextActions,
      supportNeeded,
      supportDescription: supportNeeded ? goal.support : "",
      blocker: status === "BLOCKED" ? goal.support : "",
      tags: [goal.workstream],
      workPlanMonth: MONTH,
      talkingPoints: [
        "Actions taken since the last meeting, tied to this goal",
        "Actions planned before the next meeting",
        "Where you need support from other team members",
        `Percentage to hitting the goal target: ${goal.progress}%`,
      ],
    });
    createdTasks.push({ goal, id: task._id });

    if (goal.actionsTaken.length) {
      await Activity.create({
        taskId: task._id,
        userId: owners[goal.owner]._id,
        type: "PROGRESS_UPDATE",
        message: goal.actionsTaken.join(" "),
        newProgress: goal.progress,
        createdAt: subDays(new Date("2026-08-25"), 2),
      });
    }
    if (supportNeeded) {
      await SupportRequest.create({
        taskId: task._id,
        requestedBy: owners[goal.owner]._id,
        assignedTo: will._id,
        description: goal.support,
        status: "OPEN",
      });
    }
  }

  for (const deliverableId of deliverableDocs.values()) {
    await recalculateProgress({ deliverableId: String(deliverableId) });
  }

  const meeting = await Meeting.create({
    title: "Tuesday team meeting · Aug 25",
    date: new Date("2026-08-25T06:00:00.000Z"),
    startTime: "09:00",
    endTime: "10:30",
    participantIds: [mike._id, john._id, will._id, london._id, drew._id, kuyu._id, kelvin._id],
    departmentIds: [department._id],
    projectIds: [...projectDocs.values()],
    agenda: [
      "Owner brief-outs — 5 minutes each",
      "Mike — CEAI + HQ Kenya House",
      "John — The ARC / Summer Series",
      "Will — HQ Kenya House + General Operations",
      "London — CEAI + ARC/Summer Series + CE101",
      "Drew — Nia Sessions + Creative Support",
      "Kuyu — Nia Sessions + ARC/Summer Series + PR",
      "Kelvin — Nia Sessions + Moto Tickets",
      "Decisions and action items before Friday",
    ],
    notes:
      "Each owner has 5 minutes to brief out. Speak to actions taken since Friday, actions planned before Friday, support needed, and % to goal.",
    status: "SCHEDULED",
    createdBy: will._id,
    hostId: will._id,
    workPlanMonth: MONTH,
    liveState: { currentSlideIndex: 0, isPaused: false },
  });

  await Meeting.create({
    title: "Friday team meeting · Aug 21",
    date: new Date("2026-08-21T06:00:00.000Z"),
    startTime: "09:00",
    endTime: "10:15",
    participantIds: memberIds,
    departmentIds: [department._id],
    projectIds: [...projectDocs.values()],
    agenda: ["Owner brief-outs", "Decisions", "Action items for Tuesday"],
    notes: "Friday review.",
    summary: "Team reviewed CEAI governance drafts, ARC contracts, and Nia/Moto product progress.",
    status: "COMPLETED",
    createdBy: will._id,
    hostId: will._id,
    workPlanMonth: MONTH,
    durationMinutes: 72,
    liveState: {
      currentSlideIndex: 0,
      isPaused: false,
      startedAt: new Date("2026-08-21T06:00:00.000Z"),
      endedAt: new Date("2026-08-21T07:12:00.000Z"),
    },
  });

  await Meeting.create({
    title: "Friday team meeting · Aug 28",
    date: new Date("2026-08-28T06:00:00.000Z"),
    startTime: "09:00",
    endTime: "10:30",
    participantIds: memberIds,
    departmentIds: [department._id],
    projectIds: [...projectDocs.values()],
    agenda: ["Owner brief-outs — 5 minutes each", "Decisions", "Action items before Tuesday"],
    notes: "Close the week. Confirm what must land before Tuesday.",
    status: "SCHEDULED",
    createdBy: will._id,
    hostId: will._id,
    workPlanMonth: MONTH,
    liveState: { currentSlideIndex: 0, isPaused: false },
  });

  await Decision.create({
    meetingId: meeting._id,
    title: "Storage platform",
    description: "Nia Sessions video storage",
    decision: "Pending leadership decision so Kelvin can start implementation.",
    ownerId: kelvin._id,
    createdBy: will._id,
  });

  const websiteTask = createdTasks.find(
    (item) => item.goal.owner === "kelvin" && item.goal.title === "Website",
  );
  if (websiteTask) {
    await Comment.create({
      targetType: "TASK",
      targetId: websiteTask.id,
      userId: will._id,
      body: "Please present current website state and storage options in the August 25 brief-out.",
      mentions: [kelvin._id],
    });
  }

  await Notification.create({
    userId: kelvin._id,
    type: "MEETING_CREATED",
    title: "TBB Africa brief-out scheduled",
    message: "August 2026 Team Meeting Brief-Out — 5 minutes per owner.",
    link: `/meetings/${String(meeting._id)}`,
  });
  await AuditLog.create({
    actorId: will._id,
    action: "MEETING_CREATED",
    entityType: "Meeting",
    entityId: String(meeting._id),
    details: { title: meeting.title },
  });

  console.log("Seed complete — TBB Africa August 2026 brief loaded.");
  console.log("Login (password WorkPlan2026!):");
  console.log("  mike@theburnsbrothers.com     ADMIN");
  console.log("  kelvin@theburnsbrothers.com   ADMIN");
  console.log("  will@theburnsbrothers.com     MANAGER");
  console.log("  london@theburnsbrothers.com   MANAGER");
  console.log("  john@theburnsbrothers.com     TEAM_MEMBER");
  console.log("  drew@theburnsbrothers.com     TEAM_MEMBER");
  console.log("  kuyu@theburnsbrothers.com     TEAM_MEMBER");

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
