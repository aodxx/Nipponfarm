import { useNavigate } from 'react-router-dom';
import {
  CategoryLinksSection,
  DashboardError,
  QuickActionsSection,
  TodaySummarySection,
  UrgentTasksSection,
} from '../components/dashboard/TodayDashboardSections';
import { useTodayDashboardData } from '../hooks/useTodayDashboardData';

export default function TodayDashboard() {
  const navigate = useNavigate();
  const {
    error,
    exceptionItems,
    loading,
    overdueTasks,
    todayTasks,
    urgentTasks,
  } = useTodayDashboardData();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-4 sm:px-6">
      <TodaySummarySection
        exceptionCount={exceptionItems.length}
        overdueCount={overdueTasks.length}
        todayCount={todayTasks.length}
        navigate={navigate}
      />
      <DashboardError error={error} />
      <UrgentTasksSection loading={loading} urgentTasks={urgentTasks} navigate={navigate} />
      <QuickActionsSection navigate={navigate} />
      <CategoryLinksSection navigate={navigate} />
    </div>
  );
}
