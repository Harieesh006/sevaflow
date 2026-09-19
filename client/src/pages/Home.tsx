import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  AudioLines,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Cloud,
  FileImage,
  Filter,
  ImagePlus,
  Landmark,
  MapPin,
  Mic,
  MoreHorizontal,
  Radio,
  Route,
  ScanSearch,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Upload,
  Waves,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeDescription, type Assessment, type Priority } from "@/lib/issue-intelligence";


type ReportStatus = "New" | "Assigned" | "In progress" | "Resolved";

type Report = {
  id: string;
  category: string;
  shortCategory: string;
  priority: Priority;
  location: string;
  summary: string;
  department: string;
  status: ReportStatus;
  confidence: number;
  source: "Photo" | "Text" | "Voice";
  createdAt: string;
};

const initialReports: Report[] = [
  {
    id: "SF-1027",
    category: "Waste management",
    shortCategory: "Waste",
    priority: "High",
    location: "Anna Nagar bus stop",
    summary: "Accumulated waste beside the public bus stop.",
    department: "Municipal sanitation",
    status: "Assigned",
    confidence: 91,
    source: "Photo",
    createdAt: "2 min ago",
  },
  {
    id: "SF-1026",
    category: "Road maintenance",
    shortCategory: "Roads",
    priority: "Medium",
    location: "2nd Avenue, Anna Nagar",
    summary: "Pothole widening across the left lane.",
    department: "Roads & infrastructure",
    status: "In progress",
    confidence: 87,
    source: "Text",
    createdAt: "18 min ago",
  },
  {
    id: "SF-1025",
    category: "Street lighting",
    shortCategory: "Light",
    priority: "High",
    location: "College gate, Shenoy Nagar",
    summary: "Streetlight has been out for three nights.",
    department: "Electrical services",
    status: "New",
    confidence: 94,
    source: "Voice",
    createdAt: "31 min ago",
  },
  {
    id: "SF-1024",
    category: "Water & drainage",
    shortCategory: "Water",
    priority: "Low",
    location: "B Block, Thirumangalam",
    summary: "Slow leak from a roadside water valve.",
    department: "Water works",
    status: "Resolved",
    confidence: 82,
    source: "Text",
    createdAt: "1 hr ago",
  },
];

const categoryBars = [
  { label: "Waste", value: 78, color: "bg-[#d9f06b]" },
  { label: "Roads", value: 61, color: "bg-[#69c2bc]" },
  { label: "Water", value: 42, color: "bg-[#ff9f6e]" },
  { label: "Light", value: 34, color: "bg-[#ad9cf3]" },
];

function priorityStyles(priority: Priority) {
  if (priority === "High") return "bg-[#ffe3d6] text-[#a53d17]";
  if (priority === "Medium") return "bg-[#fff2bb] text-[#756000]";
  return "bg-[#dff3ea] text-[#16715e]";
}

function statusStyles(status: ReportStatus) {
  if (status === "Resolved") return "text-[#16715e] bg-[#dff3ea]";
  if (status === "In progress") return "text-[#746000] bg-[#fff2bb]";
  if (status === "Assigned") return "text-[#175f7a] bg-[#dcf1f5]";
  return "text-[#9b4d2c] bg-[#ffe8df]";
}

function AppMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#d9f06b] text-[#173b3b] shadow-[0_8px_24px_rgba(217,240,107,0.25)]">
        <Waves className="h-5 w-5" strokeWidth={2.4} />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#f7f5ef] bg-[#ef795c]" />
      </div>
      <div>
        <div className="font-display text-[17px] font-bold tracking-[-0.04em] text-[#173b3b]">SevaFlow</div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#739090]">From complaint to action</div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#769090]">{children}</div>;
}

function CitizenView({
  description,
  setDescription,
  location,
  setLocation,
  fileName,
  filePreview,
  onFileChange,
  onAnalyze,
  analyzing,
  assessment,
  onSubmit,
  submittedReport,
  onVoice,
}: {
  description: string;
  setDescription: (value: string) => void;
  location: string;
  setLocation: (value: string) => void;
  fileName: string;
  filePreview: string;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAnalyze: () => void;
  analyzing: boolean;
  assessment: Assessment | null;
  onSubmit: () => void;
  submittedReport: Report | null;
  onVoice: () => void;
}) {
  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 lg:px-10 lg:pt-12">
      <section className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
        <div className="pt-3 lg:pt-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dfe6da] bg-[#fbfcf8] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#4a7070] shadow-[0_3px_12px_rgba(25,59,59,0.04)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#3fb69f]" />
            Civic signal desk · demo mode
          </div>
          <h1 className="max-w-[650px] font-display text-[clamp(46px,6vw,86px)] font-bold leading-[0.93] tracking-[-0.075em] text-[#173b3b]">
            Make the <span className="relative whitespace-nowrap">everyday <span className="absolute -bottom-1 left-1 right-0 h-[7px] -rotate-1 rounded-full bg-[#d9f06b]" /></span> visible.
          </h1>
          <p className="mt-7 max-w-[520px] text-[17px] leading-8 text-[#5e7070]">
            Report a public problem in the way that is easiest for you. SevaFlow turns a photo, voice note, or rough description into a clear service request in seconds.
          </p>
          <div className="mt-10 flex flex-wrap gap-7 border-t border-[#dfe6da] pt-6 text-sm text-[#496868]">
            <div><span className="font-display text-2xl font-bold text-[#173b3b]">127</span><span className="ml-2">reports structured</span></div>
            <div><span className="font-display text-2xl font-bold text-[#173b3b]">18</span><span className="ml-2">high priority</span></div>
            <div><span className="font-display text-2xl font-bold text-[#173b3b]">91%</span><span className="ml-2">avg confidence</span></div>
          </div>
          <div className="mt-14 hidden items-center gap-3 text-[#739090] lg:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5f4ef]"><ShieldCheck className="h-4 w-4 text-[#2d8f7f]" /></div>
            <span className="max-w-[300px] text-xs leading-5">AI assessment is shown with confidence and evidence. It supports a human decision — it never hides uncertainty.</span>
          </div>
        </div>

        <div className="rounded-[30px] border border-[#dce4da] bg-[#fffefa] p-4 shadow-[0_26px_80px_rgba(28,59,57,0.10)] sm:p-6">
          <div className="flex items-start justify-between gap-4 border-b border-[#e9eee7] pb-5">
            <div>
              <SectionLabel>New service request</SectionLabel>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.05em] text-[#173b3b]">What needs attention?</h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff7dd] text-[#65823b]"><Sparkles className="h-5 w-5" /></div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <label className={`group relative flex min-h-[116px] cursor-pointer flex-col justify-between rounded-2xl border-2 border-dashed p-4 transition-all ${fileName ? "border-[#3fb69f] bg-[#eff9f3]" : "border-[#dce5dc] bg-[#fbfcf8] hover:border-[#93bca8] hover:bg-[#f3f9f3]"}`}>
              <input aria-label="Upload a photo" type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={onFileChange} />
              {filePreview ? <img src={filePreview} alt="Uploaded issue preview" className="absolute inset-0 h-full w-full rounded-2xl object-cover opacity-25" /> : null}
              <div className="relative flex items-center justify-between"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e3f3e8] text-[#2d8f7f]"><Camera className="h-4 w-4" /></div><Upload className="h-4 w-4 text-[#91a7a0]" /></div>
              <div className="relative"><div className="text-sm font-bold text-[#315252]">Photo</div><div className="mt-1 text-[11px] text-[#769090]">{fileName || "Show us the issue"}</div></div>
            </label>
            <button type="button" onClick={onVoice} className="group flex min-h-[116px] flex-col justify-between rounded-2xl border border-[#dce5dc] bg-[#fbfcf8] p-4 text-left transition-all hover:border-[#93bca8] hover:bg-[#f3f9f3]">
              <div className="flex items-center justify-between"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8e1fa] text-[#7056bf]"><Mic className="h-4 w-4" /></div><AudioLines className="h-4 w-4 text-[#91a7a0]" /></div>
              <div><div className="text-sm font-bold text-[#315252]">Voice</div><div className="mt-1 text-[11px] text-[#769090]">Speak in your language</div></div>
            </button>
            <div className="flex min-h-[116px] flex-col justify-between rounded-2xl border border-[#dce5dc] bg-[#fbfcf8] p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0dc] text-[#b47236]"><Landmark className="h-4 w-4" /></div>
              <div><div className="text-sm font-bold text-[#315252]">Text</div><div className="mt-1 text-[11px] text-[#769090]">Add the details below</div></div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="description" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#668080]">Describe the problem</label>
              <Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Street light near our college has been dead for three days..." className="min-h-[116px] resize-none rounded-2xl border-[#dce5dc] bg-[#fbfcf8] px-4 py-3 text-[15px] leading-6 text-[#315252] shadow-none placeholder:text-[#a0b0aa] focus-visible:ring-[#9fc958]" />
            </div>
            <div>
              <label htmlFor="location" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#668080]">Where is it?</label>
              <div className="relative"><MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7ea19a]" /><Input id="location" value={location} onChange={(event) => setLocation(event.target.value)} className="h-12 rounded-2xl border-[#dce5dc] bg-[#fbfcf8] pl-11 text-[#315252] shadow-none focus-visible:ring-[#9fc958]" /></div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[11px] text-[#78918c]"><Wifi className="h-3.5 w-3.5 text-[#3fb69f]" /> Your report will be structured before you submit.</div>
            <Button onClick={onAnalyze} disabled={!description.trim() || analyzing} className="h-12 rounded-2xl bg-[#173b3b] px-5 text-sm font-bold text-[#f6f7ef] shadow-[0_10px_24px_rgba(23,59,59,0.18)] hover:bg-[#285657]">
              {analyzing ? <><ScanSearch className="mr-2 h-4 w-4 animate-pulse" /> Structuring signal…</> : <><Sparkles className="mr-2 h-4 w-4" /> Structure this report</>}
            </Button>
          </div>

          {assessment ? (
            <div className="mt-6 overflow-hidden rounded-[22px] border border-[#cfe2d1] bg-[#f4fbf3]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dcebdd] bg-[#eef8e9] px-5 py-4">
                <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d9f06b] text-[#315252]"><Check className="h-4 w-4" /></div><div><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#56816b]">AI assessment · demo analysis</div><div className="mt-1 text-sm font-bold text-[#173b3b]">Ready to submit as a service request</div></div></div>
                <div className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-[#37836f]">{assessment.confidence}% confidence</div>
              </div>
              <div className="grid gap-5 p-5 sm:grid-cols-[1fr_0.92fr]">
                <div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><SectionLabel>Category</SectionLabel><div className="mt-1 text-sm font-bold text-[#173b3b]">{assessment.category}</div></div>
                    <div><SectionLabel>Priority</SectionLabel><div className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${priorityStyles(assessment.priority)}`}>{assessment.priority}</div></div>
                    <div><SectionLabel>Department</SectionLabel><div className="mt-1 text-sm font-bold text-[#173b3b]">{assessment.department}</div></div>
                    <div><SectionLabel>Location</SectionLabel><div className="mt-1 truncate text-sm font-bold text-[#173b3b]">{location || "Not provided"}</div></div>
                  </div>
                  <div className="mt-5 rounded-2xl bg-white/80 p-4"><SectionLabel>Summary</SectionLabel><p className="mt-2 text-sm leading-6 text-[#496868]">{assessment.summary}</p></div>
                </div>
                <div className="rounded-2xl bg-[#173b3b] p-4 text-[#eef8e9]"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#d9f06b]"><Route className="h-4 w-4" /> Suggested action</div><p className="mt-3 text-sm leading-6 text-[#e3eee2]">{assessment.suggestedAction}</p><div className="mt-5 border-t border-white/10 pt-4"><SectionLabel>Observed in input</SectionLabel><ul className="mt-3 space-y-2">{assessment.observed.map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-[#bfd4c9]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d9f06b]" />{item}</li>)}</ul></div></div>
              </div>
              <div className="flex flex-col gap-3 border-t border-[#dcebdd] bg-white/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs text-[#6d8980]"><ShieldCheck className="h-4 w-4 text-[#3fb69f]" /> You can review before sending.</div><Button onClick={onSubmit} className="h-11 rounded-xl bg-[#d9f06b] px-5 font-bold text-[#173b3b] hover:bg-[#cce65a]"><Send className="mr-2 h-4 w-4" /> Submit report</Button></div>
            </div>
          ) : null}

          {submittedReport ? <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#bce3d1] bg-[#eaf9f0] p-4 text-sm text-[#236d5e]"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#c9f0d8]"><TicketCheck className="h-4 w-4" /></div><div><div className="font-bold">Report {submittedReport.id} is in the queue.</div><div className="mt-1 text-xs leading-5 text-[#568477]">The request is routed to {submittedReport.department}. Track it in the command center.</div></div></div> : null}
        </div>
      </section>

      <section className="mt-12 grid gap-4 border-t border-[#dfe6da] pt-7 sm:grid-cols-3">
        {[{ icon: Zap, title: "Structured in seconds", body: "Turn an unstructured complaint into category, priority, and next action." }, { icon: Route, title: "Routed with context", body: "Every issue reaches a suggested service team instead of a dead end." }, { icon: Radio, title: "Visible to the people", body: "A transparent status trail keeps the request moving from report to resolution." }].map(({ icon: Icon, title, body }) => <div key={title} className="flex gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf5df] text-[#688b40]"><Icon className="h-4 w-4" /></div><div><div className="text-sm font-bold text-[#315252]">{title}</div><p className="mt-1 text-xs leading-5 text-[#78918c]">{body}</p></div></div>)}
      </section>
    </main>
  );
}

function DashboardView({ reports, onBackToReport }: { reports: Report[]; onBackToReport: () => void }) {
  const [selectedId, setSelectedId] = useState(reports[0]?.id ?? "SF-1027");
  const [filter, setFilter] = useState<"All" | Priority>("All");
  const [query, setQuery] = useState("");
  const selected = reports.find((report) => report.id === selectedId) ?? reports[0];
  const filteredReports = useMemo(() => reports.filter((report) => (filter === "All" || report.priority === filter) && `${report.id} ${report.summary} ${report.location}`.toLowerCase().includes(query.toLowerCase())), [filter, query, reports]);
  const highCount = reports.filter((report) => report.priority === "High").length + 14;
  const openCount = reports.filter((report) => report.status !== "Resolved").length + 89;

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-12 pt-8 lg:px-10 lg:pt-10">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#173b3b] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#d9f06b]"><span className="h-1.5 w-1.5 rounded-full bg-[#d9f06b]" /> Operations live</div><h1 className="font-display text-4xl font-bold tracking-[-0.065em] text-[#173b3b] sm:text-5xl">Command center</h1><p className="mt-3 max-w-[590px] text-sm leading-6 text-[#6d8380]">A clear view of what residents are reporting, where signals are clustering, and which teams need to move next.</p></div><Button onClick={onBackToReport} variant="outline" className="h-11 rounded-xl border-[#cbd9cf] bg-transparent font-bold text-[#315252] hover:bg-[#eef5e7]"><ImagePlus className="mr-2 h-4 w-4" /> Create a report</Button></div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[{ label: "Total reports", value: reports.length + 123, change: "+12% this week", icon: TicketCheck, accent: "bg-[#e6f1d2] text-[#6d8b38]" }, { label: "High priority", value: highCount, change: "Needs attention", icon: CircleAlert, accent: "bg-[#ffe6dc] text-[#bf5935]" }, { label: "Open requests", value: openCount, change: "Across 6 teams", icon: Clock3, accent: "bg-[#e1f3f1] text-[#36877d]" }, { label: "Resolved today", value: 34, change: "+8 since 9 AM", icon: Check, accent: "bg-[#e4f5e9] text-[#27815e]" }].map(({ label, value, change, icon: Icon, accent }) => <div key={label} className="rounded-2xl border border-[#dfe7dd] bg-[#fffefa] p-5 shadow-[0_10px_26px_rgba(28,59,57,0.04)]"><div className="flex items-start justify-between"><div><div className="text-xs font-bold text-[#769090]">{label}</div><div className="mt-3 font-display text-3xl font-bold tracking-[-0.06em] text-[#173b3b]">{value}</div></div><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}><Icon className="h-4 w-4" /></div></div><div className="mt-4 text-[11px] font-semibold text-[#6f8c7d]">{change}</div></div>)}</div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.36fr_0.64fr]">
        <section className="rounded-[24px] border border-[#dfe7dd] bg-[#fffefa] p-5 shadow-[0_10px_26px_rgba(28,59,57,0.04)] sm:p-6"><div className="flex flex-col gap-4 border-b border-[#e6ece4] pb-5 sm:flex-row sm:items-center sm:justify-between"><div><SectionLabel>Incoming signals</SectionLabel><h2 className="mt-2 font-display text-xl font-bold tracking-[-0.04em] text-[#173b3b]">Recent reports</h2></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94a9a0]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-9 w-[130px] rounded-xl border-[#dfe7dd] bg-[#fbfcf8] pl-9 text-xs shadow-none" /></div><button onClick={() => setFilter(filter === "All" ? "High" : filter === "High" ? "Medium" : "All")} className="flex h-9 items-center gap-2 rounded-xl border border-[#dfe7dd] bg-[#fbfcf8] px-3 text-xs font-bold text-[#55726d]"><Filter className="h-3.5 w-3.5" /> {filter}</button></div></div><div className="mt-2">{filteredReports.map((report) => <button type="button" key={report.id} onClick={() => setSelectedId(report.id)} className={`flex w-full items-center gap-3 border-b border-[#edf1eb] py-4 text-left transition-colors last:border-0 ${selectedId === report.id ? "-mx-2 rounded-xl bg-[#f2f8ea] px-2" : "hover:bg-[#fbfcf8]"}`}><div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-[#e8f1e8] text-[#468d7d] sm:flex"><FileImage className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-[#315252]">{report.id}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityStyles(report.priority)}`}>{report.priority}</span><span className="text-[10px] text-[#94a69f]">{report.source}</span></div><div className="mt-1 truncate text-sm font-semibold text-[#4e6967]">{report.summary}</div><div className="mt-1 flex items-center gap-1 text-[11px] text-[#8aa09a]"><MapPin className="h-3 w-3" /> {report.location} · {report.createdAt}</div></div><div className="hidden items-center gap-2 text-right md:flex"><div><div className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusStyles(report.status)}`}>{report.status}</div><div className="mt-1 text-[10px] text-[#8ca099]">{report.department}</div></div><ChevronRight className="h-4 w-4 text-[#9cb0a8]" /></div></button>)}{filteredReports.length === 0 ? <div className="py-10 text-center text-sm text-[#7f9790]">No reports match this view.</div> : null}</div></section>

        <div className="space-y-6"><section className="rounded-[24px] bg-[#173b3b] p-6 text-[#f0f5ea] shadow-[0_12px_30px_rgba(23,59,59,0.12)]"><div className="flex items-start justify-between"><div><SectionLabel>Emerging hotspot</SectionLabel><h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.05em] text-white">Anna Nagar bus stop</h2></div><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#d9f06b] text-[#173b3b]"><Zap className="h-5 w-5" /></div></div><div className="mt-6 flex items-end justify-between border-b border-white/10 pb-5"><div><div className="font-display text-4xl font-bold tracking-[-0.08em] text-[#d9f06b]">20</div><div className="mt-1 text-xs text-[#a8c1b5]">related reports this week</div></div><div className="text-right"><div className="inline-flex rounded-full bg-[#ffe3d6] px-2.5 py-1 text-[10px] font-bold text-[#a53d17]">High priority</div><div className="mt-2 text-xs text-[#a8c1b5]">Waste accumulation</div></div></div><div className="mt-5 flex gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10"><Route className="h-4 w-4 text-[#d9f06b]" /></div><div><div className="text-xs font-bold text-[#e9f2e8]">Recommended next action</div><p className="mt-1 text-xs leading-5 text-[#a8c1b5]">Deploy sanitation team for an inspection and collection sweep.</p></div></div></section><section className="rounded-[24px] border border-[#dfe7dd] bg-[#fffefa] p-6 shadow-[0_10px_26px_rgba(28,59,57,0.04)]"><div className="flex items-center justify-between"><div><SectionLabel>Category distribution</SectionLabel><h2 className="mt-2 font-display text-xl font-bold tracking-[-0.04em] text-[#173b3b]">What’s being reported</h2></div><MoreHorizontal className="h-5 w-5 text-[#9eaea7]" /></div><div className="mt-6 space-y-4">{categoryBars.map((bar) => <div key={bar.label}><div className="mb-2 flex items-center justify-between text-xs font-bold text-[#57716d]"><span>{bar.label}</span><span>{bar.value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-[#edf1ea]"><div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.value}%` }} /></div></div>)}</div></section></div>
      </div>

      {selected ? <section className="mt-6 rounded-[24px] border border-[#dfe7dd] bg-[#fffefa] p-6 shadow-[0_10px_26px_rgba(28,59,57,0.04)]"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-3"><SectionLabel>Selected service request</SectionLabel><span className="rounded-full bg-[#e8f1e8] px-2.5 py-1 text-[10px] font-bold text-[#468d7d]">{selected.id}</span></div><h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.05em] text-[#173b3b]">{selected.category}</h2><p className="mt-2 max-w-[680px] text-sm leading-6 text-[#6d8380]">{selected.summary}</p></div><div className={`inline-flex self-start rounded-full px-3 py-1.5 text-xs font-bold ${statusStyles(selected.status)}`}>{selected.status}</div></div><div className="mt-6 grid gap-4 border-t border-[#e6ece4] pt-5 sm:grid-cols-2 lg:grid-cols-4"><div><SectionLabel>Location</SectionLabel><div className="mt-2 flex items-center gap-2 text-sm font-bold text-[#315252]"><MapPin className="h-4 w-4 text-[#3fb69f]" /> {selected.location}</div></div><div><SectionLabel>Department</SectionLabel><div className="mt-2 text-sm font-bold text-[#315252]">{selected.department}</div></div><div><SectionLabel>AI confidence</SectionLabel><div className="mt-2 text-sm font-bold text-[#315252]">{selected.confidence}% <span className="ml-1 text-xs font-normal text-[#89a099]">structured</span></div></div><div><SectionLabel>Timeline</SectionLabel><div className="mt-2 flex items-center gap-2 text-sm font-bold text-[#315252]"><Clock3 className="h-4 w-4 text-[#3fb69f]" /> {selected.createdAt}</div></div></div><div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-[#f4f8ef] p-4 text-xs text-[#617c73]"><div className="flex items-center gap-2 font-bold text-[#397e70]"><Check className="h-4 w-4" /> Report created</div><ChevronRight className="h-3.5 w-3.5 text-[#a7bab0]" /><div className="flex items-center gap-2"><Check className="h-4 w-4 text-[#7ab296]" /> AI analyzed</div><ChevronRight className="h-3.5 w-3.5 text-[#a7bab0]" /><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#f2ae42]" /> Department action pending</div></div></section> : null}
    </main>
  );
}

export default function Home() {
  const [view, setView] = useState<"report" | "dashboard">(() => new URLSearchParams(window.location.search).get("view") === "dashboard" ? "dashboard" : "report");
  const [description, setDescription] = useState("This has been here for 4 days beside the bus stop.");
  const [location, setLocation] = useState("Anna Nagar, Chennai");
  const [fileName, setFileName] = useState("");
  const [filePreview, setFilePreview] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFilePreview(URL.createObjectURL(file));
    toast.success("Photo added", { description: "The image will be included in the assessment." });
  };

  const handleAnalyze = () => {
    if (!description.trim()) return;
    setAnalyzing(true);
    setSubmittedReport(null);
    window.setTimeout(() => {
      setAssessment(analyzeDescription(description));
      setAnalyzing(false);
    }, 850);
  };

  const handleSubmit = () => {
    if (!assessment) return;
    const report: Report = {
      id: `SF-${1028 + reports.length - initialReports.length}`,
      category: assessment.category,
      shortCategory: assessment.shortCategory,
      priority: assessment.priority,
      location: location || "Location pending",
      summary: assessment.summary,
      department: assessment.department,
      status: "New",
      confidence: assessment.confidence,
      source: fileName ? "Photo" : "Text",
      createdAt: "just now",
    };
    setReports((current) => [report, ...current]);
    setSubmittedReport(report);
    toast.success("Report created", { description: `${report.id} is ready for routing.` });
  };

  const handleVoice = () => {
    setDescription("Anna Nagar bus stop pakkathula romba garbage irukku. Four days ah clean pannala.");
    toast.info("Voice note transcribed", { description: "Demo transcript inserted for review." });
  };

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#173b3b]">
      <header className="sticky top-0 z-30 border-b border-[#e4e9df]/90 bg-[#f7f5ef]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 lg:px-10"><button type="button" onClick={() => setView("report")} aria-label="Go to SevaFlow home"><AppMark /></button><div className="hidden items-center gap-2 rounded-full border border-[#dfe7dd] bg-[#fbfcf8] p-1 md:flex"><button type="button" onClick={() => setView("report")} className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${view === "report" ? "bg-[#173b3b] text-white" : "text-[#6f8781] hover:text-[#315252]"}`}>Report an issue</button><button type="button" onClick={() => setView("dashboard")} className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${view === "dashboard" ? "bg-[#173b3b] text-white" : "text-[#6f8781] hover:text-[#315252]"}`}>Command center</button></div><div className="flex items-center gap-3"><div className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#77918a] sm:flex"><Cloud className="h-3.5 w-3.5 text-[#3fb69f]" /> AWS-ready workflow</div><div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dce5dc] bg-[#fffefa] text-xs font-bold text-[#315252]">AK</div></div></div>
      </header>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 pb-2 pt-4 md:hidden"><button type="button" onClick={() => setView("report")} className={`rounded-full px-3 py-2 text-xs font-bold ${view === "report" ? "bg-[#173b3b] text-white" : "text-[#6f8781]"}`}>Report</button><button type="button" onClick={() => setView("dashboard")} className={`rounded-full px-3 py-2 text-xs font-bold ${view === "dashboard" ? "bg-[#173b3b] text-white" : "text-[#6f8781]"}`}>Command center</button></div>
      {view === "report" ? <CitizenView description={description} setDescription={setDescription} location={location} setLocation={setLocation} fileName={fileName} filePreview={filePreview} onFileChange={handleFileChange} onAnalyze={handleAnalyze} analyzing={analyzing} assessment={assessment} onSubmit={handleSubmit} submittedReport={submittedReport} onVoice={handleVoice} /> : <DashboardView reports={reports} onBackToReport={() => setView("report")} />}
      <footer className="mx-auto flex max-w-[1440px] flex-col gap-3 border-t border-[#dfe6da] px-5 py-6 text-[11px] text-[#8aa09a] sm:flex-row sm:items-center sm:justify-between lg:px-10"><div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-[#3fb69f]" /> SevaFlow AI · Structured service requests for everyday places</div><div className="flex items-center gap-4"><span>Assessment is assistive, not definitive.</span><span className="hidden text-[#6a8982] sm:inline-flex">S3 · Lambda · Bedrock · DynamoDB</span></div></footer>
    </div>
  );
}
