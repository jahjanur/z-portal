import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Check } from "lucide-react";
import { useAdmin } from "../../contexts/AdminContext";
import TaskBoard from "../../components/admin/TaskBoard";
import StatusBadge from "../../components/ui/StatusBadge";
import EmptyState from "../../components/ui/EmptyState";
import Button from "../../components/ui/Button";
import { SkeletonDashboard } from "../../components/ui/Skeleton";
import { ServiceBadge, ServiceSummaryView, ColorsView, LinksView, CredentialsView } from "../../components/admin/ServiceFields";
import type { LinkItem, CredItem } from "../../components/admin/ServiceFields";
import { getServiceDef } from "../../utils/serviceTypes";

interface ChecklistItem { label: string; done?: boolean }
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function fmtMoney(v: unknown) { const n = Number(v); return `$${(Number.isFinite(n) ? n : 0).toLocaleString()}`; }

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { projects, adminOwnTasks, tasks, deleteTask, loading } = useAdmin();

  const pid = Number(id);
  const project = projects.find((p) => p.id === pid);
  const projectTasks = (adminOwnTasks?.length ? adminOwnTasks : tasks).filter((t) => t.projectId === pid);

  if (loading && !project) {
    return <div className="mx-auto max-w-[1100px]"><SkeletonDashboard /></div>;
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-[1100px]">
        <Link to="/admin/zulbera/tasks" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"><ArrowLeft className="h-4 w-4" /> Back to Tasks</Link>
        <EmptyState title="Service not found" description="This project may have been deleted." />
      </div>
    );
  }

  const def = getServiceDef(project.serviceType);
  const meta = (project.metadata || {}) as Record<string, unknown>;

  // Build a display list of the simple, scalar type-specific fields that have values.
  const SCALAR_TYPES = ["money", "url", "date", "text", "number", "platforms"];
  const detailFields = def.fields
    .filter((f) => SCALAR_TYPES.includes(f.type))
    .map((f) => ({ ...f, value: meta[f.key] }))
    .filter((f) => f.value !== undefined && f.value !== "" && !(Array.isArray(f.value) && f.value.length === 0));

  const checklists = def.fields.filter((f) => f.type === "checklist" && asArr(meta[f.key]).length > 0);
  const colorFields = def.fields.filter((f) => f.type === "colors" && asArr(meta[f.key]).length > 0);
  const linkFields = def.fields.filter((f) => f.type === "links" && asArr(meta[f.key]).length > 0);
  const credFields = def.fields.filter((f) => f.type === "credentials" && asArr(meta[f.key]).length > 0);
  const noteFields = def.fields.filter((f) => f.type === "textarea" && typeof meta[f.key] === "string" && (meta[f.key] as string).trim());
  const hasExtras =
    detailFields.length > 0 || checklists.length > 0 || colorFields.length > 0 || linkFields.length > 0 || credFields.length > 0 || noteFields.length > 0;

  const completed = projectTasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <Link to="/admin/zulbera/tasks" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]">
        <ArrowLeft className="h-4 w-4" /> Back to Tasks
      </Link>

      {/* Header */}
      <div className="card-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <ServiceBadge serviceType={project.serviceType} />
              <StatusBadge status={project.status || "ACTIVE"} />
            </div>
            <h1 className="page-title">{project.name}</h1>
            <p className="page-subtitle">
              {project.client ? `${project.client.name}${project.client.company ? ` — ${project.client.company}` : ""}` : "Standalone service"}
              {project.description ? ` · ${project.description}` : ""}
            </p>
          </div>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: def.accent + "22", color: def.accent }}>
            <def.icon className="h-6 w-6" />
          </span>
        </div>
        <ServiceSummaryView serviceType={project.serviceType} metadata={meta} />
      </div>

      {/* Type-specific details */}
      {hasExtras && (
        <div className="bento">
          {colorFields.map((f) => (
            <div key={f.key} className="col-6 card-panel p-5 sm:p-6">
              <h3 className="section-title mb-4">{f.label}</h3>
              <ColorsView colors={meta[f.key] as string[]} />
            </div>
          ))}

          {linkFields.map((f) => (
            <div key={f.key} className="col-6 card-panel p-5 sm:p-6">
              <h3 className="section-title mb-4">{f.label}</h3>
              <LinksView items={meta[f.key] as LinkItem[]} />
            </div>
          ))}

          {credFields.map((f) => (
            <div key={f.key} className="col-6 card-panel p-5 sm:p-6">
              <h3 className="section-title mb-4">{f.label}</h3>
              <CredentialsView items={meta[f.key] as CredItem[]} />
            </div>
          ))}

          {noteFields.map((f) => (
            <div key={f.key} className="col-6 card-panel p-5 sm:p-6">
              <h3 className="section-title mb-3">{f.label}</h3>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">{String(meta[f.key])}</p>
            </div>
          ))}

          {detailFields.length > 0 && (
            <div className="col-6 card-panel p-5 sm:p-6">
              <h3 className="section-title mb-4">{def.label} details</h3>
              <dl className="space-y-3">
                {detailFields.map((f) => (
                  <div key={f.key} className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0">
                    <dt className="text-sm text-[var(--color-text-muted)]">{f.label}</dt>
                    <dd className="min-w-0 text-right text-sm font-semibold text-[var(--color-text-primary)]">
                      {f.type === "money" ? fmtMoney(f.value)
                        : f.type === "url" ? <a href={String(f.value)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--color-info-text)] hover:underline">Open <ExternalLink className="h-3 w-3" /></a>
                        : f.type === "date" ? new Date(String(f.value)).toLocaleDateString()
                        : f.type === "platforms" && Array.isArray(f.value) ? (
                          <span className="flex flex-wrap justify-end gap-1">{(f.value as string[]).map((p) => <span key={p} className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-0.5 text-xs">{p}</span>)}</span>
                        ) : String(f.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {checklists.map((f) => {
            const items = meta[f.key] as ChecklistItem[];
            const done = items.filter((i) => i.done).length;
            return (
              <div key={f.key} className="col-6 card-panel p-5 sm:p-6">
                <h3 className="section-title mb-1">{f.label}</h3>
                <p className="mb-4 text-xs text-[var(--color-text-muted)]">{done} of {items.length} complete</p>
                <ul className="space-y-2">
                  {items.map((it, i) => (
                    <li key={i} className="flex items-center gap-2.5">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${it.done ? "border-[var(--color-success-border)] bg-[var(--color-success-bg)] text-[var(--color-success-text)]" : "border-[var(--color-border-hover)] text-transparent"}`}><Check className="h-3.5 w-3.5" /></span>
                      <span className={`text-sm ${it.done ? "text-[var(--color-text-muted)] line-through" : "text-[var(--color-text-secondary)]"}`}>{it.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Tasks for this service */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="section-title">Tasks <span className="ml-1 text-sm font-normal text-[var(--color-text-muted)]">{completed}/{projectTasks.length} done</span></h3>
          <Button variant="secondary" size="sm" onClick={() => navigate("/admin/zulbera/tasks")}>Open board</Button>
        </div>
        {projectTasks.length > 0 ? (
          <TaskBoard tasks={projectTasks} onDelete={deleteTask} view="board" />
        ) : (
          <EmptyState compact title="No tasks yet" description="Tasks assigned to this service will appear here." />
        )}
      </div>
    </div>
  );
}
