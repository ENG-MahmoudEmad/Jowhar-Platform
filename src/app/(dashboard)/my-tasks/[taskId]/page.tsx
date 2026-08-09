// src/app/(dashboard)/my-tasks/[taskId]/page.tsx
import { notFound } from 'next/navigation';
import { getMyTaskById } from '../actions';
import TaskDetailClient from './TaskDetailClient';

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  const task = await getMyTaskById(taskId);

  if (!task) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <TaskDetailClient initialTask={task} />
    </div>
  );
}