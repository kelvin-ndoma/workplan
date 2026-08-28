import { Deliverable } from "@/models/Deliverable";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { weightedProgress } from "@/lib/progress";

export async function recalculateProgress(options: {
  deliverableId?: string | null;
  projectId?: string | null;
}) {
  const deliverableId = options.deliverableId
    ? String(options.deliverableId)
    : null;
  const projectId = options.projectId ? String(options.projectId) : null;

  if (deliverableId) {
    const tasks = await Task.find({ deliverableId });
    const progress = weightedProgress(
      tasks.map((task) => ({
        progress: task.progress,
        weight: task.weight,
        status: task.status,
      })),
    );
    await Deliverable.findByIdAndUpdate(deliverableId, { progress });
  }

  const projectToUpdate =
    projectId ??
    (deliverableId
      ? (await Deliverable.findById(deliverableId))?.projectId
      : null);

  if (projectToUpdate) {
    const deliverables = await Deliverable.find({ projectId: projectToUpdate });
    if (deliverables.length > 0) {
      const progress = weightedProgress(
        deliverables.map((item) => ({
          progress: item.progress,
          weight: 1,
          status: item.status,
        })),
      );
      await Project.findByIdAndUpdate(projectToUpdate, { progress });
      return;
    }

    const tasks = await Task.find({ projectId: projectToUpdate });
    const progress = weightedProgress(
      tasks.map((task) => ({
        progress: task.progress,
        weight: task.weight,
        status: task.status,
      })),
    );
    await Project.findByIdAndUpdate(projectToUpdate, { progress });
  }
}
