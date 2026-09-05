import { useEffect, useMemo, useState } from 'react';
import { isPast, isToday, parseISO } from 'date-fns';
import { UnifiedWorkItem } from '../lib/taskEngine';
import { subscribeToUnifiedWorkQueue } from '../services/workQueueService';

export function useTodayDashboardData() {
  const [workItems, setWorkItems] = useState<UnifiedWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToUnifiedWorkQueue(
      (items) => {
        setWorkItems(items);
        setLoading(false);
      },
      () => {
        setError('โหลดคิวงานฟาร์มไม่สำเร็จ');
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const todayTasks = useMemo(
    () => workItems.filter((item) => item.dueDate && isToday(parseISO(item.dueDate))),
    [workItems],
  );

  const overdueTasks = useMemo(
    () => workItems.filter((item) => item.dueDate && isPast(parseISO(item.dueDate)) && !isToday(parseISO(item.dueDate))),
    [workItems],
  );

  const exceptionItems = useMemo(
    () => workItems.filter((item) => item.kind === 'EXCEPTION'),
    [workItems],
  );

  const urgentTasks = useMemo(() => {
    const urgentIds = new Set([
      ...exceptionItems.map((item) => item.id),
      ...overdueTasks.map((item) => item.id),
      ...todayTasks.map((item) => item.id),
    ]);
    return workItems.filter((item) => urgentIds.has(item.id)).slice(0, 5);
  }, [workItems, exceptionItems, overdueTasks, todayTasks]);

  return {
    error,
    exceptionItems,
    loading,
    overdueTasks,
    todayTasks,
    urgentTasks,
    workItems,
  };
}
