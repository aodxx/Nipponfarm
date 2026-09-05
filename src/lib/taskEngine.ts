export type WorkItemKind = 'TASK' | 'EXCEPTION';
export type WorkItemSource = 'BREEDING' | 'MAINTENANCE' | 'FINANCE' | 'PAYROLL' | 'SYSTEM';
export type WorkItemPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type WorkItemStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface UnifiedWorkItem {
  id: string;
  kind: WorkItemKind;
  source: WorkItemSource;
  sourceId: string;
  title: string;
  reason: string;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  dueDate?: string;
  assigneeUid?: string | null;
  route?: string;
  createdAt: number;
  updatedAt?: number;
  metadata?: Record<string, unknown>;
}

const PRIORITY_RANK: Record<WorkItemPriority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};

const breedingTitle: Record<string, string> = {
  HEAT_CHECK: 'ตรวจกลับสัด',
  ULTRASOUND: 'ตรวจท้อง',
  MOVE_TO_FARROW: 'ย้ายเข้าเล้าคลอด',
  FARROW: 'กำหนดคลอด',
  WEAN: 'หย่านม',
  BREED: 'ผสมพันธุ์',
  VACCINE: 'วัคซีน',
  BACK_TO_HEAT: 'ตรวจกลับสัด',
};

export interface LegacyBreedingTaskLike {
  id?: string;
  sowId: string;
  sowDisplayId: string;
  type: string;
  dueDate: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: number;
  isDraft?: boolean;
}

export interface MaintenanceLike {
  id?: string;
  title: string;
  location: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: number;
}

export const normalizeBreedingTask = (task: LegacyBreedingTaskLike): UnifiedWorkItem => ({
  id: `breeding:${task.id ?? `${task.sowId}:${task.type}:${task.dueDate}`}`,
  kind: 'TASK',
  source: 'BREEDING',
  sourceId: task.id ?? task.sowId,
  title: `${breedingTitle[task.type] ?? task.type} · ${task.sowDisplayId}`,
  reason: task.isDraft ? 'กำหนดการณ์จากวงจรการสืบพันธุ์ (รอยืนยัน)' : 'งานที่เกิดจากวงจรการสืบพันธุ์',
  priority: task.type === 'FARROW' ? 'HIGH' : 'NORMAL',
  status: task.status === 'PENDING' ? 'OPEN' : task.status,
  dueDate: task.dueDate,
  route: `/sows/${task.sowId}`,
  createdAt: task.createdAt,
  metadata: { sowId: task.sowId, taskType: task.type, isDraft: Boolean(task.isDraft) },
});

export const normalizeMaintenanceRequest = (request: MaintenanceLike): UnifiedWorkItem => ({
  id: `maintenance:${request.id ?? request.createdAt}`,
  kind: request.urgency === 'CRITICAL' || request.urgency === 'HIGH' ? 'EXCEPTION' : 'TASK',
  source: 'MAINTENANCE',
  sourceId: request.id ?? String(request.createdAt),
  title: request.title,
  reason: `แจ้งซ่อมที่ ${request.location}`,
  priority: request.urgency === 'MEDIUM' ? 'NORMAL' : request.urgency,
  status: request.status === 'PENDING' ? 'OPEN' : request.status === 'RESOLVED' ? 'COMPLETED' : 'IN_PROGRESS',
  route: '/maintenance',
  createdAt: request.createdAt,
  metadata: { location: request.location, urgency: request.urgency },
});

export const sortUnifiedWorkItems = (items: UnifiedWorkItem[], today: string = new Date().toISOString().slice(0, 10)) => (
  [...items].sort((a, b) => {
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    const aOverdue = Boolean(a.dueDate && a.dueDate < today);
    const bOverdue = Boolean(b.dueDate && b.dueDate < today);
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    return b.createdAt - a.createdAt;
  })
);

export const isActionableWorkItem = (item: UnifiedWorkItem) => item.status === 'OPEN' || item.status === 'IN_PROGRESS';
