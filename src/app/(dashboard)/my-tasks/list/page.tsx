// src/app/(dashboard)/my-tasks/list/page.tsx
import { listMyTasks } from '../actions';
import TaskListClient from './TaskListClient';

export default async function TaskListPage() {
  const tasks = await listMyTasks();

  return (
    <div className="max-w-2xl mx-auto">
      <TaskListClient initialTasks={tasks} />
    </div>
  );
}