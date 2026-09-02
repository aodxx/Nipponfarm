import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc } from "firebase/firestore";
import cron from "node-cron";

// Read Firebase config from workspace root
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

// Initialize private Firestore instance for backend background jobs
const app = initializeApp(firebaseConfig, "DailyCronApp");
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Returns date string YYYY-MM-DD for today and tomorrow in Asia/Bangkok time zone
 */
export function getBangkokDates() {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  };
  const formatter = new Intl.DateTimeFormat("en-US", options);
  
  const now = new Date();
  const [{ value: month }, , { value: day }, , { value: year }] = formatter.formatToParts(now);
  const todayStr = `${year}-${month}-${day}`;
  
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [{ value: tMonth }, , { value: tDay }, , { value: tYear }] = formatter.formatToParts(tomorrow);
  const tomorrowStr = `${tYear}-${tMonth}-${tDay}`;

  const displayDate = `${day}/${month}/${year}`;
  
  return { todayStr, tomorrowStr, displayDate };
}

/**
 * Posts an alert message to Admin Group Chat if SMTP fails
 */
export async function sendAdminChatAlert(errorMessage: string) {
  try {
    console.log("[Daily Tasks Email] Sending Admin Chat Alert for error:", errorMessage);
    
    // Find all users who are ADMINs
    const usersQuery = query(collection(db, "users"), where("role", "==", "ADMIN"));
    const usersSnap = await getDocs(usersQuery);
    const adminUids = usersSnap.docs.map(d => d.id);
    
    if (adminUids.length === 0) {
      console.log("[Daily Tasks Email] No admins found to alert in database.");
      return;
    }

    // Search for existing System Alerts room
    const roomsQuery = query(collection(db, "chat_rooms"), where("isGroup", "==", true));
    const roomsSnap = await getDocs(roomsQuery);
    let alertRoomId = "";
    
    for (const d of roomsSnap.docs) {
      const data = d.data();
      if (data.name === "การแจ้งเตือนจากระบบ (System Alerts)") {
        alertRoomId = d.id;
        break;
      }
    }
    
    if (!alertRoomId) {
      // Create a brand new System Alerts room
      const roomRef = doc(collection(db, "chat_rooms"));
      alertRoomId = roomRef.id;
      
      const participantNames: Record<string, string> = {};
      const unreadCount: Record<string, number> = {};
      
      usersSnap.docs.forEach(d => {
        const userData = d.data();
        participantNames[d.id] = userData.displayName || "Admin User";
        unreadCount[d.id] = 0;
      });
      
      await setDoc(roomRef, {
        id: alertRoomId,
        isGroup: true,
        name: "การแจ้งเตือนจากระบบ (System Alerts)",
        participants: adminUids,
        participantNames,
        unreadCount,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      console.log("[Daily Tasks Email] Created system alerts chat room:", alertRoomId);
    }
    
    // Post message
    await addDoc(collection(db, "chat_messages"), {
      roomId: alertRoomId,
      senderId: "system_cron",
      senderName: "ระบบอัตโนมัติ (Nipon Farm Cron)",
      content: `⚠️ [ระบบแจ้งเตือนตารางงานล้มเหลว]\nตรวจพบข้อผิดพลาดในการส่งตารางงานดูแลแม่หมูรายวันเข้าอีเมล\n\nรายละเอียดข้อผิดพลาด:\n"${errorMessage}"\n\nวันที่พยายามส่ง: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} น.\nกรุณาเข้าตรวจสอบการตั้งค่า SMTP หรือปัญหาเน็ตเวิร์กที่หน้าแผงจัดการเซิร์ฟเวอร์ครับ`,
      read: false,
      createdAt: Date.now()
    });
    
    // Update last message in the room
    const roomRef = doc(db, "chat_rooms", alertRoomId);
    await updateDoc(roomRef, {
      lastMessage: "⚠️ ตรวจพบข้อผิดพลาดในระบบส่งอีเมล",
      lastMessageTime: Date.now(),
      lastMessageSenderId: "system_cron",
      updatedAt: Date.now()
    });
    
    console.log("[Daily Tasks Email] Successfully logged Error Alert message in Chat Room.");
  } catch (err) {
    console.error("[Daily Tasks Email] CRITICAL: Failed to push system alert into Admin chat:", err);
  }
}

/**
 * Builds a gorgeous, professional responsive HTML Email template for a user's task summary
 */
export function buildDailyTaskEmailHtml(
  userName: string,
  displayDate: string,
  summary: { farrowCount: number; ultrasoundCount: number; breedCount: number; otherCount: number },
  groups: {
    farrowing: any[];
    pregnancy: any[];
    breeding: any[];
    others: any[];
  }
): string {
  const totalTasks = summary.farrowCount + summary.ultrasoundCount + summary.breedCount + summary.otherCount;

  // Helper to generate rows for a table
  const renderTableRows = (items: any[]) => {
    if (items.length === 0) {
      return `
        <tr>
          <td colspan="5" style="padding: 20px; text-align: center; color: #94a3b8; font-style: italic; font-size: 14px;">
            🎉 ไม่มีงานกำหนดทำในช่วงเวลานี้
          </td>
        </tr>
      `;
    }
    return items.map(item => {
      const formattedDate = item.dueDate.split("-").reverse().join("/"); // DD/MM/YYYY
      const isTomorrow = item.dueDate !== getBangkokDates().todayStr;
      const dateBadgeStyle = isTomorrow 
        ? "background-color: #f1f5f9; color: #475569; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 6px;"
        : "background-color: #fef2f2; color: #dc2626; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 6px;";
      
      const taskLabel = item.type === "FARROW" ? "🎂 เฝ้าคลอด" :
                        item.type === "MOVE_TO_FARROW" ? "🚚 ย้ายขึ้นตึกคลอด" :
                        item.type === "ULTRASOUND" ? "🔍 อัลตราซาวด์" :
                        item.type === "HEAT_CHECK" ? "🎯 เช็กสัด" :
                        item.type === "BACK_TO_HEAT" ? "🔄 ตรวจกลับสัด" :
                        item.type === "WEAN" ? "🍼 หย่านมสะสม" :
                        item.type === "BREED" ? "🐷 ผสมพันธุ์ใหม่" :
                        item.type === "VACCINE" ? "💉 ทำวัคซีนประจำวัน" : item.type;

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 16px; font-family: monospace; font-size: 14px; color: #0f172a; font-weight: bold;">
            ${item.sowDisplayId || "-"}
          </td>
          <td style="padding: 12px 16px; font-size: 14px; color: #334155;">
            ${item.breed || "-"}
          </td>
          <td style="padding: 12px 16px; font-size: 14px; color: #334155; text-align: center;">
            ${item.parity !== undefined ? item.parity : "-"}
          </td>
          <td style="padding: 12px 16px; font-size: 14px; color: #334155; text-align: center; font-weight: 500;">
            ${item.penId || `<span style="color: #94a3b8; font-size: 12px;">ไม่ได้ระบุ</span>`}
          </td>
          <td style="padding: 12px 16px; text-align: right;">
            <div style="font-size: 13px; color: #0f172a; margin-bottom: 4px; font-weight: 500;">${formattedDate}</div>
            <span style="${dateBadgeStyle}">${isTomorrow ? "พรุ่งนี้" : "วันนี้"}</span>
          </td>
        </tr>
      `;
    }).join("");
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>สรุปตารางงานแม่หมูรายวัน - นิพนธ์ฟาร์ม</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; line-height: 1.5; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Wrapper -->
        <table width="100%" class="main-card" style="max-width: 650px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;" border="0" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; color: #a7f3d0; opacity: 0.9;">
                      NIPHON FARM AUTOMATION
                    </span>
                    <h1 style="margin: 8px 0 4px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                      สรุปตารางงานดูแลแม่หมูรายวัน
                    </h1>
                    <p style="margin: 0; font-size: 15px; color: #ecfdf5; opacity: 0.9;">
                      ประจำวันที่ ${displayDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 24px;">
              <p style="margin-top: 0; font-size: 16px; color: #334155;">
                สวัสดีคุณ <strong>${userName}</strong>,
              </p>
              <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">
                ระบบขับเคลื่อนงานฟาร์มอัตโนมัติได้รวบรวมรายการดูแลแม่พันธุ์สุกรที่ครบกำหนดต้องดำเนินการใน <strong>วันนี้และวันพรุ่งนี้</strong> มาเพื่อรายงานล่วงหน้า ช่วยในการจัดระบบคอก เตรียมเวชภัณฑ์ และจัดสรรกำลังคนครับ
              </p>

              <!-- Dashboard Summary Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 15px; font-weight: bold; color: #065f46; padding-bottom: 12px;">
                    📊 ปริมาณงานทั้งหมดในระบบ: <span style="font-size: 18px; color: #047857;">${totalTasks} รายงาน</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <!-- 4-Column Responsive Layout using nested tables -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="4">
                      <tr>
                        <td width="50%" style="font-size: 13px; color: #065f46;">
                          • <strong>กลุ่มเฝ้าคลอด (Farrowing):</strong> ${summary.farrowCount} ตัว
                        </td>
                        <td width="50%" style="font-size: 13px; color: #065f46;">
                          • <strong>ตรวจครรภ์/สัด (Ultrasound/Heat):</strong> ${summary.ultrasoundCount} ตัว
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="font-size: 13px; color: #065f46;">
                          • <strong>เตรียมผสม/หย่านม (Breed/Wean):</strong> ${summary.breedCount} ตัว
                        </td>
                        <td width="50%" style="font-size: 13px; color: #065f46;">
                          • <strong>วัคซีน/อื่นๆ (Others):</strong> ${summary.otherCount} ตัว
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 1. กลุ่มงานเฝ้าคลอด / ย้ายตึกคลอด -->
              <div style="margin-bottom: 28px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-left: 4px solid #10b981; padding-left: 8px;">
                  👶 กลุ่มงานเฝ้าคลอด / ย้ายตึกคลอด (FARROW / MOVE_TO_FARROW)
                </h3>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">เบอร์หู</th>
                      <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">สายพันธุ์</th>
                      <th align="center" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 60px;">ท้องที่</th>
                      <th align="center" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 80px;">คอกขัง</th>
                      <th align="right" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 120px;">กำหนดวัน</th>
                    </tr>
                    ${renderTableRows(groups.farrowing)}
                  </table>
                </div>
              </div>

              <!-- 2. กลุ่มงานตรวจครรภ์ / กลับสัด -->
              <div style="margin-bottom: 28px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-left: 4px solid #3b82f6; padding-left: 8px;">
                  🔍 กลุ่มงานตรวจครรภ์ / เช็กกลับสัด (ULTRASOUND / HEAT_CHECK)
                </h3>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">เบอร์หู</th>
                      <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">สายพันธุ์</th>
                      <th align="center" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 60px;">ท้องที่</th>
                      <th align="center" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 80px;">คอกขัง</th>
                      <th align="right" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 120px;">กำหนดวัน</th>
                    </tr>
                    ${renderTableRows(groups.pregnancy)}
                  </table>
                </div>
              </div>

              <!-- 3. กลุ่มงานหย่านม / เตรียมผสม -->
              <div style="margin-bottom: 28px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-left: 4px solid #f59e0b; padding-left: 8px;">
                  🐷 กลุ่มงานหย่านม / เตรียมผสมพันธุ์ใหม่ (WEAN / BREED)
                </h3>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">เบอร์หู</th>
                      <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">สายพันธุ์</th>
                      <th align="center" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 60px;">ท้องที่</th>
                      <th align="center" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 80px;">คอกขัง</th>
                      <th align="right" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 120px;">กำหนดวัน</th>
                    </tr>
                    ${renderTableRows(groups.breeding)}
                  </table>
                </div>
              </div>

              <!-- 4. งานอื่นๆ และวัคซีน -->
              <div style="margin-bottom: 16px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-left: 4px solid #8b5cf6; padding-left: 8px;">
                  💉 งานป้องกันโรคและอื่นๆ (VACCINE / OTHERS)
                </h3>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                    <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                      <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">เบอร์หู</th>
                      <th align="left" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase;">สายพันธุ์</th>
                      <th align="center" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 60px;">ท้องที่</th>
                      <th align="center" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 80px;">คอกขัง</th>
                      <th align="right" style="padding: 10px 16px; font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; width: 120px;">กำหนดวัน</th>
                    </tr>
                    ${renderTableRows(groups.others)}
                  </table>
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                อีเมลฉบับนี้ส่งโดยระบบขับเคลื่อนอัตโนมัติ <strong>นิพนธ์ฟาร์ม (Niphon Farm Workflow Node)</strong>
              </p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
                © 2026 นิพนธ์ฟาร์ม. สงวนลิขสิทธิ์ความปลอดภัยข้อมูลฟาร์ม 100%
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Main routine that loops over users, queries relevant tasks & sows, joins data,
 * and dispatches customized daily alert emails.
 */
export async function triggerDailyTasksAlert(): Promise<{
  success: boolean;
  timestamp: number;
  usersProcessed: number;
  emailsSent: number;
  emailsSimulatedCount: number;
  details: string[];
}> {
  const report = {
    success: true,
    timestamp: Date.now(),
    usersProcessed: 0,
    emailsSent: 0,
    emailsSimulatedCount: 0,
    details: [] as string[]
  };

  try {
    console.log("[Daily Tasks Email] Initializing daily task scanner...");
    
    // 1. Get dates
    const { todayStr, tomorrowStr, displayDate } = getBangkokDates();
    report.details.push(`Dates evaluated: Today=${todayStr}, Tomorrow=${tomorrowStr}`);

    // 2. Fetch active users (ADMIN or STAFF)
    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any));
    
    const activeUsers = users.filter(u => u.role === "ADMIN" || u.role === "STAFF");
    report.usersProcessed = activeUsers.length;
    report.details.push(`Found ${activeUsers.length} active users to evaluate (ADMIN/STAFF)`);

    // Setup SMTP transporter config if exists
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || '"Nipon Farm Admin" <noreply@niponfarm.com>';

    // Loop over each active user to build and dispatch their personalized report
    for (const currentUser of activeUsers) {
      try {
        const uid = currentUser.uid;
        const email = currentUser.email;
        const userName = currentUser.displayName || "ผู้ปฏิบัติงานนิพนธ์ฟาร์ม";

        if (!email) {
          report.details.push(`Skipping user ${userName} (${uid}) because email is missing.`);
          continue;
        }

        // Fetch user's tasks
        const tasksQ = query(collection(db, "tasks"), where("userId", "==", uid), where("status", "==", "PENDING"));
        const tasksSnap = await getDocs(tasksQ);
        const allTasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // Filter for today or tomorrow
        const targetTasks = allTasks.filter(t => t.dueDate === todayStr || t.dueDate === tomorrowStr);
        
        if (targetTasks.length === 0) {
          report.details.push(`User ${userName} (${email}) has no pending tasks for today or tomorrow.`);
          continue;
        }

        // Fetch user's sows for joining
        const sowsQ = query(collection(db, "sows"), where("userId", "==", uid));
        const sowsSnap = await getDocs(sowsQ);
        const sows = sowsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const sowsMap = new Map<string, any>();
        sows.forEach(s => sowsMap.set(s.id || s.sowId, s));

        // Join data and group
        const groups = {
          farrowing: [] as any[],
          pregnancy: [] as any[],
          breeding: [] as any[],
          others: [] as any[]
        };

        targetTasks.forEach(task => {
          // Join with sow
          const sow = sowsMap.get(task.sowId);
          const joinedTask = {
            ...task,
            breed: sow ? sow.breed : "",
            parity: sow ? sow.parity : task.parity,
            penId: sow ? sow.penId : task.penId
          };

          // Categorize
          if (task.type === "FARROW" || task.type === "MOVE_TO_FARROW") {
            groups.farrowing.push(joinedTask);
          } else if (task.type === "ULTRASOUND" || task.type === "HEAT_CHECK" || task.type === "BACK_TO_HEAT") {
            groups.pregnancy.push(joinedTask);
          } else if (task.type === "WEAN" || task.type === "BREED") {
            groups.breeding.push(joinedTask);
          } else {
            groups.others.push(joinedTask);
          }
        });

        const summary = {
          farrowCount: groups.farrowing.length,
          ultrasoundCount: groups.pregnancy.length,
          breedCount: groups.breeding.length,
          otherCount: groups.others.length
        };

        // Create HTML Content
        const htmlContent = buildDailyTaskEmailHtml(userName, displayDate, summary, groups);

        // Try sending via SMTP
        if (host && user && pass) {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass }
          });

          await transporter.sendMail({
            from,
            to: email,
            subject: `[นิพนธ์ฟาร์ม] สรุปตารางงานแม่หมูรายวัน ประจำวันที่ ${displayDate}`,
            html: htmlContent
          });

          console.log(`[Daily Tasks Email] Sent successfully via SMTP to ${email}`);
          report.emailsSent++;
          report.details.push(`Sent email successfully to ${userName} (${email}) containing ${targetTasks.length} tasks.`);
        } else {
          // Simulation Fallback
          console.log("==========================================================");
          console.log("          SMTP SIMULATED DAILY TASKS EMAIL LOG            ");
          console.log("==========================================================");
          console.log(`To: ${email}`);
          console.log(`Subject: [นิพนธ์ฟาร์ม] สรุปตารางงานแม่หมูรายวัน ประจำวันที่ ${displayDate}`);
          console.log(`Details: ${targetTasks.length} tasks scheduled for today and tomorrow.`);
          console.log("==========================================================");

          report.emailsSimulatedCount++;
          report.details.push(`Simulated email for ${userName} (${email}) containing ${targetTasks.length} tasks (No SMTP secrets config).`);
        }
      } catch (userErr: any) {
        console.error(`[Daily Tasks Email] Failed to process user ${currentUser.displayName || currentUser.uid}:`, userErr);
        report.details.push(`Failed to process user ${currentUser.uid}: ${userErr.message}`);
        
        // Send alert to admin room
        await sendAdminChatAlert(`ไม่สามารถประมวลผลตารางงานของพนักงานได้: ${userErr.message}`);
      }
    }

    console.log(`[Daily Tasks Email] Completed scanner run. Dispatched: ${report.emailsSent}, Simulated: ${report.emailsSimulatedCount}`);
    return report;

  } catch (err: any) {
    console.error("[Daily Tasks Email] CRITICAL SCANNER ERROR:", err);
    report.success = false;
    report.details.push(`Critical failure: ${err.message}`);
    
    // Post security/system warning to admin chats
    await sendAdminChatAlert(`เกิดข้อผิดพลาดระดับวิกฤตของระบบสแกนตารางงานหลังบ้าน: ${err.message}`);
    
    return report;
  }
}

/**
 * Initializes and schedules the background Daily cron job at 05:00 AM Bangkok Time
 */
export function initDailyTasksCron() {
  console.log("[Daily Tasks Email] Registering daily scheduler (node-cron) for 05:00 AM Bangkok Time...");
  
  // Cron schedule for 05:00 AM: "0 5 * * *"
  cron.schedule("0 5 * * *", async () => {
    console.log("[Daily Tasks Email] Cron triggered! Executing automated morning schedule scanner...");
    try {
      const result = await triggerDailyTasksAlert();
      console.log("[Daily Tasks Email] Automated scan completed successfully:", result);
    } catch (err) {
      console.error("[Daily Tasks Email] Cron execution failed:", err);
    }
  }, {
    timezone: "Asia/Bangkok"
  });
}
