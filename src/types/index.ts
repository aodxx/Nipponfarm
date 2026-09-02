export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'ADMIN' | 'STAFF' | 'RESIGNED' | 'PENDING';
  resignationReason?: string;
  createdAt: number;
  phone?: string;
  lineId?: string;
  address?: string;
  emergencyContact?: string;
  jobTitle?: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  photoURL?: string;
}

export type SowStatus = 'IDLE' | 'MATED' | 'PREGNANT' | 'LACTATING' | 'RECOVERY' | 'CULLED';

export interface Sow {
  id?: string;
  userId: string;
  sowId: string; // เบอร์หู
  breed: string;
  type?: 'SOW' | 'BOAR';
  birthDate: string; // YYYY-MM-DD
  entryDate: string; // YYYY-MM-DD
  status: SowStatus;
  parity: number;
  penId?: string | null; // e.g., 'L-01', 'R-50', or null if in holding area
  recordedBy?: string; // name
  createdAt: number;
  updatedAt: number;
}

export type EventType = 'BREED' | 'ULTRASOUND' | 'FARROW' | 'WEAN' | 'HEALTH' | 'CULL' | 'HEAT_RETURN';

export interface SowEvent {
  id?: string;
  userId: string;
  sowId: string; // reference to Sow document ID
  type: EventType;
  date: string; // YYYY-MM-DD
  parity: number;
  details: any; // specific details based on type
  videoUrl?: string | null; // optional Cloudflare R2 video link
  recordedBy?: string; // name
  createdAt: number;
}

export type TaskType = 'HEAT_CHECK' | 'ULTRASOUND' | 'MOVE_TO_FARROW' | 'FARROW' | 'WEAN' | 'BREED' | 'VACCINE' | 'BACK_TO_HEAT';

export interface Task {
  id?: string;
  userId: string;
  sowId: string; // reference to Sow document ID
  sowDisplayId: string; // เบอร์หู (for quick display)
  type: TaskType;
  dueDate: string; // YYYY-MM-DD
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  isDraft?: boolean; // ร่างกำหนดการณ์ล่วงหน้าก่อนตรวจท้อง
  createdAt: number;
}

export interface EmployeeTransaction {
  id?: string;
  userId: string;
  employeeName: string;
  amount: number;
  type: 'advance' | 'payment';
  date: string; // YYYY-MM-DD
  signature?: string; // Base64 image of the signature
  slipImage?: string; // Base64 image of bank transfer slip
  createdAt: number;
}

export interface SalaryAdvance {
  id?: string;
  userId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  slipImage?: string; // Base64 image of bank transfer slip
  createdAt: number;
  updatedAt: number;
}

export interface EmployeeBaseSalary {
  id?: string;
  userId: string;
  base_salary: number;
  updatedAt: number;
}

export interface WeighingRecord {
  id: string; // generate using Date.now().toString()
  index: number;
  grossWeight: number | '';
  tareWeight: number | '';
  netWeight: number;
}

export interface PigSale {
  id?: string;
  userId: string;
  recordedBy?: string;
  date: string; // YYYY-MM-DD
  saleId: string; // Reference/Invoice number
  buyerName: string;
  buyerEmail?: string;
  vehicleReg: string;
  saleType: string; // e.g. "ขายเหมา", "ขายคัด"
  paymentStatus: 'PAID' | 'UNPAID';
  totalPigs: number;
  pricePerKg: number;
  deductions: number;
  records: WeighingRecord[];
  totalNetWeight: number;
  averageWeight: number;
  grossTotal: number;
  netTotal: number;
  signature: string; // Base64
  deliveryPhoto?: string; // Optional Delivery Photo (optimized WebP url or base64)
  createdAt: number;
}

export interface NewsPost {
  id?: string;
  userId: string;
  authorName: string;
  authorPhotoUrl?: string;
  content: string;
  imageUrls: string[]; // Up to 3 images
  videoUrl?: string; // Optional single video
  audioUrl?: string; // Optional single audio
  likedBy?: string[]; // Array of User IDs who liked the post
  createdAt: number;
}

export interface ChatRoom {
  id: string; // Typically generated manually or by Firebase
  isGroup?: boolean;
  name?: string; // For group chat
  participants: string[]; // Array of UIDs
  participantNames: Record<string, string>; // Map of UID to Display Name
  lastMessage?: string;
  lastMessageTime?: number;
  lastMessageSenderId?: string;
  unreadCount?: Record<string, number>; // Map of UID to unread count
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id?: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  read: boolean;
  createdAt: number;
}

export interface PayrollSlip {
  id?: string;
  userId: string;
  periodYear: number;
  periodMonth: number;
  periodIndex: 1 | 2; // 1 = 1st-15th, 2 = 16th-End
  baseSalary: number; // 50% of monthly base
  advancesAmount: number; // Automatic deductions from approved advances
  customDeductions: number; // Manual deductions
  customIncome: number; // Manual income/bonus
  netSalary: number;
  status: 'PENDING' | 'PAID';
  paymentDate?: number; // timestamp when paid
  slipImage?: string; // Base64 image of bank transfer slip
  createdAt: number;
  updatedAt: number;
}

