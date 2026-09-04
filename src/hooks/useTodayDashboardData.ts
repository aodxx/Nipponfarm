import { useEffect, useMemo, useState } from 'react';
import { isPast, isToday, parseISO } from 'date-fns';
import { subscribeToAllPendingTasks, subscribeToSows } from '../services/sowService';

export function useTodayDashboardData() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [sows, setSows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let tasksReady = false;
    let sowsReady = false;
    const sync = () => setLoading(!(tasksReady && sowsReady));

    const unsubTasks = subscribeToAllPendingTasks(
      (items) => {
        tasksReady = true;
        setTasks(items);
        sync();
      },
      () => {
        tasksReady = true;
        setError('โหลดรายการงานไม่สำเร็จ');
        sync();
      },
    );

    const unsubSows = subscribeToSows(
      (items) => {
        sowsReady = true;
        setSows(items);
        sync();
      },
      () => {
        sowsReady = true;
        setError('โหลดข้อมูลแม่พันธุ์ไม่สำเร็จ');
        sync();
      },
    );

    return () => {
      unsubTasks();
      unsubSows();
    };
  }, []);

  const todayTasks = useMemo(
    () => tasks.filter((task) => task?.dueDate && isToday(parseISO(task.dueDate))),
    [tasks],
  );
  const overdueTasks = useMemo(
    () => tasks.filter((task) => task?.dueDate && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate))),
    [tasks],
  );
  const urgentTasks = useMemo(
    () => [...overdueTasks, ...todayTasks].slice(0, 5),
    [overdueTasks, todayTasks],
  );
  const activeSows = useMemo(
    () => sows.filter((sow) => sow?.type !== 'BOAR' && sow?.status !== 'CULLED'),
    [sows],
  );

  return {
    activeSows,
    error,
    loading,
    overdueTasks,
    todayTasks,
    urgentTasks,
  };
}
