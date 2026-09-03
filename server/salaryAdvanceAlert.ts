import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, addDoc, updateDoc } from "firebase/firestore";
import { getFirebaseRuntimeConfig } from "./firebaseConfig.js";

const firebaseConfig = getFirebaseRuntimeConfig();

// Safe initialization of Firebase for server-side utilities
const app = getApps().length === 0 ? initializeApp(firebaseConfig, "SalaryAdvanceApp") : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Posts an alert message to Admin Group Chat if SMTP fails
 */
async function sendAdminChatAlert(errorMessage: string) {
  try {
    console.log("[Salary Advance Email] Sending Admin Chat Alert for error:", errorMessage);
    
    // Find all users who are ADMINs
    const usersQuery = query(collection(db, "users"), where("role", "==", "ADMIN"));
    const usersSnap = await getDocs(usersQuery);
    const adminUids = usersSnap.docs.map(d => d.id);
    
    if (adminUids.length === 0) {
      console.log("[Salary Advance Email] No admins found to alert in database.");
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
    }
    
    // Post message
    await addDoc(collection(db, "chat_messages"), {
      roomId: alertRoomId,
      senderId: "system_cron",
      senderName: "ระบบอัตโนมัติ (Nipon Farm Cron)",
      content: `⚠️ [ระบบการส่งอีเมลเบิกเงินเดือนขัดข้อง]\nรายละเอียดข้อผิดพลาด:\n"${errorMessage}"\n\nเวลาขัดข้อง: ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })} น.\nกรุณาเข้าตรวจสอบที่ระบบหลังบ้านเพื่ออนุมัติโดยตรงครับ`,
      read: false,
      createdAt: Date.now()
    });
    
    // Update last message in the room
    const roomRef = doc(db, "chat_rooms", alertRoomId);
    await updateDoc(roomRef, {
      lastMessage: "⚠️ ระบบแจ้งเตือนคำขอเบิกเงินเดือนขัดข้อง",
      lastMessageTime: Date.now(),
      lastMessageSenderId: "system_cron",
      updatedAt: Date.now()
    });
    
    console.log("[Salary Advance Email] Admin Chat Alert sent.");
  } catch (err) {
    console.error("[Salary Advance Email] Failed to push chat alert:", err);
  }
}

/**
 * Generates beautiful HTML for Admin email regarding a new request
 */
function buildAdminAlertHtml(
  employeeName: string,
  role: string,
  amount: number,
  reason: string,
  date: string,
  approvalLink: string
): string {
  const formattedAmount = amount.toLocaleString("th-TH");
  const formattedDate = date.split("-").reverse().join("/"); // DD/MM/YYYY
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>คำขอเบิกเงินล่วงหน้าใหม่ - นิพนธ์ฟาร์ม</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: linear-gradient(135deg, #db2777 0%, #be185d 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
              <span style="font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; color: #fbcfe8;">
                SALARY ADVANCE REQUEST
              </span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">
                คำขออนุมัติเบิกเงินล่วงหน้าใหม่
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin-top: 0; font-size: 16px; color: #334155; font-weight: bold;">
                เรียน ผู้ดูแลระบบ (Admin),
              </p>
              <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">
                มีพนักงานยื่นคำขอเบิกเงินล่วงหน้าใหม่ผ่านระบบ โดยมีรายละเอียดที่ต้องพิจารณาประกอบการทำจ่ายและอนุมัติดังนี้:
              </p>

              <!-- Request Information Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 16px; margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 14px; color: #4f1115; padding: 6px 0;">
                    👤 <strong>ชื่อพนักงาน:</strong> ${employeeName}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #4f1115; padding: 6px 0;">
                    💼 <strong>ตำแหน่ง/บทบาท:</strong> ${role}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #4f1115; padding: 6px 0;">
                    💰 <strong>จำนวนเงินที่ขอเบิก:</strong> <span style="font-size: 18px; font-weight: bold; color: #db2777;">฿${formattedAmount} บาท</span>
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #4f1115; padding: 6px 0;">
                    📅 <strong>วันที่ต้องการใช้เงิน:</strong> ${formattedDate}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 14px; color: #4f1115; padding: 6px 0;">
                    📝 <strong>เหตุผลความจำเป็น:</strong> ${reason || "ไม่ได้ระบุเหตุผลความจำเป็น"}
                  </td>
                </tr>
              </table>

              <!-- Action Link -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${approvalLink}" style="background-color: #db2777; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; padding: 14px 28px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 6px rgba(219, 39, 119, 0.2);">
                      ตรวจสอบและอนุมัติทำจ่ายที่นี่ ➔
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
                * ลิงก์ด้านบนต้องการสิทธิ์ผู้ดูแลระบบ (ADMIN) ในการเข้าพิจารณาตารางทำจ่ายพนักงาน
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              <strong>ระบบการเงินอัตโนมัติ นิพนธ์ฟาร์ม (Niphon Farm Workflow Node)</strong>
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
 * Generates beautiful HTML for Employee regarding decision output
 */
function buildEmployeeDecisionHtml(
  employeeName: string,
  amount: number,
  status: "APPROVED" | "REJECTED",
  date: string,
  slipImage?: string,
  rejectReason?: string
): string {
  const formattedAmount = amount.toLocaleString("th-TH");
  const formattedDate = date.split("-").reverse().join("/"); // DD/MM/YYYY
  const isApproved = status === "APPROVED";
  const primaryColor = isApproved ? "#059669" : "#dc2626";
  const statusLabel = isApproved ? "อนุมัติจ่ายเงินสำเร็จ" : "ปฏิเสธคำขอ";
  const bannerBackground = isApproved 
    ? "linear-gradient(135deg, #059669 0%, #047857 100%)" 
    : "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ผลการพิจารณาเบิกเงินล่วงหน้า - นิพนธ์ฟาร์ม</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background: ${bannerBackground}; padding: 32px 24px; text-align: center; color: #ffffff;">
              <span style="font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; opacity: 0.9;">
                SALARY ADVANCE STATUS UPDATE
              </span>
              <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">
                คำขอเบิกเงินล่วงหน้าได้รับการ [${statusLabel}]
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px;">
              <p style="margin-top: 0; font-size: 16px; color: #334155;">
                สวัสดีคุณ <strong>${employeeName}</strong>,
              </p>
              
              ${isApproved ? `
                <p style="font-size: 15px; color: #047857; font-weight: bold; margin-bottom: 20px;">
                  🎉 ข่าวดี! คำขอเบิกเงินล่วงหน้าของคุณได้รับการอนุมัติและทำธุรกรรมโอนเงินสำเร็จเรียบร้อยแล้ว รายละเอียดธุรกรรมมีดังนี้:
                </p>

                <!-- Approved Details Card -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                  <tr>
                    <td style="font-size: 14px; color: #14532d; padding: 4px 0;">
                      💰 <strong>ยอดเงินเบิกอนุมัติ:</strong> <span style="font-size: 18px; font-weight: bold; color: #059669;">฿${formattedAmount} บาท</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 14px; color: #14532d; padding: 4px 0;">
                      📅 <strong>วันที่ทำจ่าย:</strong> ${formattedDate}
                    </td>
                  </tr>
                </table>

                ${slipImage ? `
                  <!-- Slip Image Attachment -->
                  <div style="margin-top: 20px; text-align: center;">
                    <p style="font-size: 14px; font-weight: bold; color: #475569; margin-bottom: 12px;">📷 รูปภาพหลักฐานการโอนเงิน (จากธนาคาร):</p>
                    <a href="${slipImage}" target="_blank">
                      <img src="${slipImage}" alt="Bank Transfer Slip" style="max-width: 100%; max-height: 400px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);" referrerPolicy="no-referrer" />
                    </a>
                    <p style="font-size: 12px; color: #94a3b8; margin-top: 6px;">คลิกรูปเพื่อขยายและบันทึกสลิปเก็บไว้เป็นหลักฐาน</p>
                  </div>
                ` : ""}

              ` : `
                <p style="font-size: 15px; color: #b91c1c; font-weight: bold; margin-bottom: 20px;">
                  ⚠️ ขออภัยด้วยครับ, คำขอเบิกเงินล่วงหน้าของคุณในวันที่ ${formattedDate} จำนวนเงิน ฿${formattedAmount} ไม่ผ่านการอนุมัติในรอบนี้
                </p>

                <!-- Rejected Card -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                  <tr>
                    <td style="font-size: 14px; color: #7f1d1d;">
                      💬 <strong>เหตุผลที่ไม่อนุมัติ:</strong> ${rejectReason || "ไม่ได้ระบุเหตุผล หรือ กรุณาติดต่อสอบถามข้อมูลเพิ่มเติมกับผู้จัดสรรงาน/แอดมินโดยตรง"}
                    </td>
                  </tr>
                </table>
                
                <p style="font-size: 14px; color: #475569;">
                  หากมีคำถามหรือความจำเป็นเร่งด่วนเพิ่มเติม สามารถพูดคุยเพื่อสอบถามแอดมินหรือผู้บริหารฟาร์มได้โดยตรงผ่านห้องแชทของทางฟาร์มในระบบครับ
                </p>
              `}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
              <strong>ระบบการเงินอัตโนมัติ นิพนธ์ฟาร์ม (Niphon Farm Workflow Node)</strong>
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
 * Logic to process Stage 1 - Send email to admin users
 */
export async function handleNewAdvanceEmail(advanceId: string, hostname: string) {
  try {
    console.log(`[Stage 1 Email] Triggered for Advance Request: ${advanceId}`);
    
    // Get advance request doc
    const advSnap = await getDoc(doc(db, "salary_advances", advanceId));
    if (!advSnap.exists()) {
      throw new Error(`Salary advance record ${advanceId} not found.`);
    }
    const advance = advSnap.data();

    // Get applicant (employee) user profile
    const empSnap = await getDoc(doc(db, "users", advance.userId));
    if (!empSnap.exists()) {
      throw new Error(`Employee profile ${advance.userId} not found.`);
    }
    const employee = empSnap.data();

    const employeeName = employee.displayName || "พนักงานไม่ทราบชื่อ";
    const employeeRole = employee.role || "STAFF";

    // Setup Deep link back to system
    const protocol = hostname.includes("localhost") || hostname.includes("127.0.0.1") ? "http" : "https";
    const approvalLink = `${protocol}://${hostname}/payroll/advance-approval`;

    const htmlContent = buildAdminAlertHtml(
      employeeName,
      employeeRole,
      advance.amount,
      advance.reason || "",
      advance.date,
      approvalLink
    );

    // Fetch all Admin emails
    const adminsQuery = query(collection(db, "users"), where("role", "==", "ADMIN"));
    const adminsSnap = await getDocs(adminsQuery);
    const adminEmails = adminsSnap.docs.map(d => d.data().email).filter(Boolean);

    if (adminEmails.length === 0) {
      console.log("[Stage 1 Email] No administrator emails found to send to.");
      return { success: true, warning: "No admins found" };
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || '"Nipon Farm Admin" <noreply@niponfarm.com>';

    if (host && user && pass) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      for (const email of adminEmails) {
        await transporter.sendMail({
          from,
          to: email,
          subject: `[คำขอเบิกเงิน] มีคำขอเบิกเงินล่วงหน้ารอการอนุมัติจากคุณ ${employeeName}`,
          html: htmlContent
        });
      }

      console.log(`[Stage 1 Email] Sent to ${adminEmails.length} admin(s) successfully.`);
      return { success: true, sentCount: adminEmails.length };
    } else {
      // Simulation Log fallback
      console.log("==========================================================");
      console.log("          SMTP SIMULATED NEW REQUEST ALERT EMAIL          ");
      console.log("==========================================================");
      console.log(`To Admins: ${adminEmails.join(", ")}`);
      console.log(`Subject: [คำขอเบิกเงิน] มีคำขอเบิกเงินล่วงหน้ารอการอนุมัติจากคุณ ${employeeName}`);
      console.log(`Requested amount: ฿${advance.amount.toLocaleString()}`);
      console.log(`Deep Link: ${approvalLink}`);
      console.log("==========================================================");

      return { success: true, simulated: true, sentCount: adminEmails.length };
    }

  } catch (err: any) {
    console.error("[Stage 1 Email] CRITICAL FAILURE:", err);
    await sendAdminChatAlert(`ไม่สามารถส่งอีเมลแจ้งคำขอเบิกล่วงหน้าได้: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Logic to process Stage 2 - Send decision results email back to the employee
 */
export async function handleDecisionEmail(advanceId: string) {
  try {
    console.log(`[Stage 2 Email] Triggered for decision update of: ${advanceId}`);

    // Get advance request doc
    const advSnap = await getDoc(doc(db, "salary_advances", advanceId));
    if (!advSnap.exists()) {
      throw new Error(`Salary advance record ${advanceId} not found.`);
    }
    const advance = advSnap.data();

    // Get applicant (employee) user profile
    const empSnap = await getDoc(doc(db, "users", advance.userId));
    if (!empSnap.exists()) {
      throw new Error(`Employee profile ${advance.userId} not found.`);
    }
    const employee = empSnap.data();

    const employeeName = employee.displayName || "พนักงานไม่ทราบชื่อ";
    const employeeEmail = employee.email;

    if (!employeeEmail) {
      console.log(`[Stage 2 Email] Skipping because employee ${employeeName} has no registered email.`);
      return { success: true, warning: "Employee has no email" };
    }

    const htmlContent = buildEmployeeDecisionHtml(
      employeeName,
      advance.amount,
      advance.status,
      advance.date,
      advance.slipImage,
      advance.rejectReason
    );

    const statusLabelText = advance.status === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ";

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || '"Nipon Farm Admin" <noreply@niponfarm.com>';

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
        to: employeeEmail,
        subject: `[ผลการอนุมัติ] คำขอเบิกเงินล่วงหน้าของคุณได้รับการ [${statusLabelText}] เรียบร้อยแล้ว`,
        html: htmlContent
      });

      console.log(`[Stage 2 Email] Sent successfully to employee ${employeeEmail}.`);
      return { success: true };
    } else {
      // Simulation Log fallback
      console.log("==========================================================");
      console.log("         SMTP SIMULATED STATUS RESULT EMAIL LOG           ");
      console.log("==========================================================");
      console.log(`To Employee: ${employeeEmail}`);
      console.log(`Subject: [ผลการอนุมัติ] คำขอเบิกเงินล่วงหน้าของคุณได้รับการ [${statusLabelText}] เรียบร้อยแล้ว`);
      console.log(`Status: ${advance.status}`);
      console.log(`Amount: ฿${advance.amount.toLocaleString()}`);
      if (advance.slipImage) {
        console.log(`Slip Image: ${advance.slipImage}`);
      }
      console.log("==========================================================");

      return { success: true, simulated: true };
    }

  } catch (err: any) {
    console.error("[Stage 2 Email] CRITICAL FAILURE:", err);
    await sendAdminChatAlert(`ไม่สามารถส่งอีเมลแจ้งผลการอนุมัติเงินเดือนพนักงานได้: ${err.message}`);
    return { success: false, error: err.message };
  }
}
