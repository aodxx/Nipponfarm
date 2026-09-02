# เอกสารข้อมูลเชิงเทคนิคของระบบ (Technical Documentation)
## ระบบบริหารจัดการฟาร์มสุกร (Nipon Farm Management System)

เอกสารฉบับนี้จัดทำขึ้นเพื่อแสดงภาพรวมสถาปัตยกรรมระบบ โครงสร้างฐานข้อมูล (Database Schema / Relations) และรายการ API Endpoints ทั้งหมดในระบบปัจจุบันเพื่อใช้ในการตรวจสอบและควบคุมความถูกต้องของระบบ

---

## 1. สถาปัตยกรรมระบบและทิศทางการไหลของข้อมูล (System Architecture & Data Flow)

ระบบนี้พัฒนาขึ้นในรูปแบบ **Full-Stack Web Application** ที่มีสถาปัตยกรรมแบบแยกส่วน (Separation of Concerns) ระหว่างหน้าบ้านและหลังบ้าน โดยมีการทำงานหลักอยู่บน Cloud Infrastructure ดังนี้:

```
+---------------------------------------------------------------------------------+
|                                 CLIENT SIDE                                     |
|  [ React 19 + TypeScript ] <---> [ Tailwind CSS v4 + Motion for UX/Animations ] |
|  [ Recharts for Analytics ] <--> [ Firebase SDK (Direct Live Firestore Sync) ]  |
+---------------------------------------------------------------------------------+
                                         ^
                                         | (Secure Web API Calls)
                                         v
+---------------------------------------------------------------------------------+
|                                 SERVER SIDE                                     |
|  [ Node.js + Express.js API ]  <-----> [ Bundled into dist/server.cjs (esbuild)]|
|                                                                                 |
|  - GET /api/weather       -> Proxy to Open-Meteo API with Offline Fallback      |
|  - POST /api/receipt      -> AI OCR (Gemini 2.5/3.5) with fuzzy catalog mapping |
|  - POST /api/text-to-speech -> Thai Voice synthesis (Gemini 3.1 TTS Preview)    |
|  - GET /api/proxy         -> Solves CORS for image rendering                    |
+---------------------------------------------------------------------------------+
                      |                                       |
                      v                                       v
+-----------------------------+                     +-----------------------------+
|    CLOUD REPOSITORIES       |                     |      EXTERNAL PROVIDERS     |
|  [ Firebase Auth / OAuth ]  |                     |  [ Google Gemini API Key ]  |
|  [ Firestore NoSQL DB ]     |                     |  [ Open-Meteo API Service ] |
+-----------------------------+                     +-----------------------------+
```

### รายละเอียดเทคโนโลยีที่เลือกใช้ (Technology Stack)
*   **Frontend (หน้าบ้าน):**
    *   **React 19 (SPA)**: ใช้ในการพัฒนา UI มีความเร็วสูงและรองรับสถาปัตยกรรม Component สมัยใหม่
    *   **Tailwind CSS v4 & Motion**: ใช้ในการจัดเลย์เอาต์ ปรับแต่งองค์ประกอบแบบ Premium UX และมี Micro-animations คล้ายแอปพลิเคชันบนอุปกรณ์เคลื่อนที่
    *   **Vite**: เครื่องมือในการ Bundling และ Build หน้าบ้านที่มีประสิทธิภาพสูง
*   **Backend (หลังบ้าน):**
    *   **Express.js (Node.js)**: สำหรับจัดการทางผ่านข้อมูล (API Router) และงานเบื้องหลังที่ต้องการความปลอดภัยของ API Keys
    *   **esbuild & tsx**: ใช้บีบอัดและรวมสคริปต์หลังบ้านเป็นก้อนเดียว (`dist/server.cjs`) เพื่อการ Cold Start บนคลาวด์ที่รวดเร็ว
*   **ฐานข้อมูลและการยืนยันตัวตน (Database & Authentication):**
    *   **Firebase Firestore (NoSQL)**: เก็บข้อมูลในรูปของ JSON-like Document รองรับการ Sync ข้อมูลแบบ Real-time (ผ่าน WebSocket จาก Client โดยตรง) และเขียนกฎความปลอดภัยใน `firestore.rules` เพื่อปกป้องข้อมูลรายผู้ใช้
    *   **Firebase Authentication**: รองรับการลงทะเบียนและเข้าระบบด้วย Email/Password รวมถึงการจัดการสิทธิ์พนักงาน (Role-Based Access Control: Admin, Staff, Pending, Resigned)
*   **Infrastructure (การติดตั้งระบบ):**
    *   ระบบรันอยู่บนคอนเทนเนอร์ของ **Google Cloud Run** ซึ่งจะ Scale-to-Zero เมื่อไม่มีการใช้งานเพื่อประหยัดทรัพยากร และเชื่อมต่อผ่าน Nginx Reverse Proxy บังคับใช้พอร์ต **3000** เสมอ

---

## 2. โครงสร้างฐานข้อมูลและการเชื่อมโยง (Database Schema & Relations)

เนื่องจากระบบใช้ **Google Cloud Firestore (NoSQL)** โครงสร้างจึงอยู่ในรูปแบบของ **Collection (ตาราง)** และ **Document (แถวข้อมูล)** ซึ่งเชื่อมโยงกันแบบสัมพันธ์ (Relational Mapping) ผ่านคีย์จำพวก `userId` หรือ `sowId` ดังนี้:

### แผนผังความสัมพันธ์ (Entity Relationship Overview)
*   `UserProfile (1)` <---> `Sow (N)` (เชื่อมด้วย `userId` เพื่อแยกฟาร์ม)
*   `Sow (1)` <---> `SowEvent (N)` (เชื่อมด้วย `sowId` เพื่อดูประวัติรายตัว)
*   `Sow (1)` <---> `Task (N)` (เชื่อมด้วย `sowId` เพื่อกำหนดงานดูแล)
*   `Bill (1)` <---> `BillItem (N)` (เชื่อมด้วย `billId` สำหรับรายการสินค้าในบิลส่งของวัตถุดิบ)

---

### รายละเอียดโครงสร้างแต่ละตาราง (Collections & Fields Schema)

#### 1. Collection: `users` (UserProfile)
เก็บประวัติและข้อมูลสิทธิ์การใช้งานของสมาชิกฟาร์มและพนักงาน
*   **Document ID**: `{userId}` (UID จาก Firebase Auth)
*   **ฟิลด์ข้อมูล**:
    *   `uid` (string, required): รหัสผู้ใช้งาน
    *   `email` (string, required): อีเมลพนักงาน
    *   `displayName` (string, required): ชื่อ-นามสกุลจริง
    *   `role` (string, required): สิทธิ์ผู้ใช้ (`ADMIN`, `STAFF`, `PENDING`, `RESIGNED`)
    *   `resignationReason` (string, optional): เหตุผลการลาออก (กรณี resigned)
    *   `phone` (string, optional): เบอร์โทรศัพท์
    *   `lineId` (string, optional): ไอดีไลน์ติดต่อ
    *   `address` (string, optional): ที่อยู่ปัจจุบัน
    *   `emergencyContact` (string, optional): ผู้ติดต่อฉุกเฉิน
    *   `jobTitle` (string, optional): ตำแหน่งงาน
    *   `createdAt` (number, required): วันที่สมัครเข้าระบบ (Epoch millisecond)

#### 2. Collection: `sows` (Sow)
ตารางหลักเก็บประวัติแม่พันธุ์และพ่อพันธุ์สุกรในฟาร์ม
*   **Document ID**: อัตโนมัติ (เช่น `sow_12345`)
*   **ฟิลด์ข้อมูล**:
    *   `userId` (string, required): รหัสเจ้าของฟาร์ม / ผู้บันทึก
    *   `sowId` (string, required): หมายเลขหูหมู/เบอร์แม่พันธุ์ (เช่น "N105")
    *   `breed` (string, optional): สายพันธุ์ (เช่น "แลนด์เรซ", "ลาร์จไวท์")
    *   `type` (string, optional): ประเภทสุกร (`SOW` = แม่พันธุ์, `BOAR` = พ่อพันธุ์)
    *   `birthDate` (string, optional): วันเกิด (YYYY-MM-DD)
    *   `entryDate` (string, optional): วันที่เริ่มนำเข้าเล้า (YYYY-MM-DD)
    *   `status` (string, required): สถานะปัจจุบัน (`IDLE`=ว่างเปล่า, `MATED`=ผสมแล้ว, `PREGNANT`=อุ้มท้อง, `LACTATING`=เลี้ยงลูก, `RECOVERY`=พักฟื้น, `CULLED`=คัดทิ้ง)
    *   `parity` (number, required): ลำดับท้องปัจจุบัน (รอบการให้ผลผลิต)
    *   `penId` (string, optional): หมายเลขช่อง/คอกขัง
    *   `recordedBy` (string, optional): ชื่อผู้บันทึกข้อมูล
    *   `createdAt` (number, required): วันที่เพิ่มเข้าระบบ (Epoch millisecond)
    *   `updatedAt` (number, required): วันที่อัปเดตสถานะล่าสุด (Epoch millisecond)

#### 3. Collection: `events` (SowEvent)
ตารางประวัติกิจกรรมทางชีววิทยาของแม่หมูแต่ละตัวในฟาร์ม
*   **Document ID**: อัตโนมัติ
*   **ฟิลด์ข้อมูล**:
    *   `userId` (string, required): รหัสเจ้าของฟาร์ม
    *   `sowId` (string, required): หมายเลขหูแม่หมู (เชื่อมโยงไปยัง `Sow`)
    *   `type` (string, required): กิจกรรม (`BREED`=ผสมพันธุ์, `ULTRASOUND`=ตรวจครรภ์, `FARROW`=คลอดลูก, `WEAN`=หย่านม, `HEALTH`=บันทึกรักษาสุขภาพ, `CULL`=ส่งคัดทิ้ง, `HEAT_RETURN`=กลับสัด)
    *   `date` (string, required): วันที่เกิดกิจกรรม (YYYY-MM-DD)
    *   `parity` (number, required): ท้องรอบที่เกิดกิจกรรมนี้
    *   `details` (map/object, optional): รายละเอียดขยายตามสถานะ (เช่น ข้อมูลพ่อพันธุ์ คัดท้อง ตรวจพบจำนวนลูกมีชีวิต/ตายโคม และฟิลด์ `attachmentUrl` สำหรับลิงก์รูปภาพบันทึกอาการหรือประวัติยาในกิจกรรม HEALTH)
    *   `recordedBy` (string, optional): พนักงานผู้บันทึกกิจกรรม
    *   `createdAt` (number, required): วันที่บันทึกข้อมูลเข้าระบบ

#### 4. Collection: `tasks` (Task)
ระบบแจ้งเตือนและรายการงานปฏิบัติการล่วงหน้าของหมูแต่ละคอก
*   **Document ID**: อัตโนมัติ
*   **ฟิลด์ข้อมูล**:
    *   `userId` (string, required): รหัสเจ้าของฟาร์ม
    *   `sowId` (string, required): รหัสภายในของแม่หมู
    *   `sowDisplayId` (string, required): เบอร์หูแม่หมูโชว์หน้าหน้าจอ
    *   `type` (string, required): ชื่องานปฏิบัติงาน (`HEAT_CHECK`=กลับสัด, `ULTRASOUND`=ตรวจครรภ์, `MOVE_TO_FARROW`=ย้ายเข้าตึกคลอด, `FARROW`=เฝ้าคลอด, `WEAN`=หย่านม, `BREED`=เตรียมผสมรอบใหม่)
    *   `dueDate` (string, required): วันกำหนดส่งงาน (YYYY-MM-DD)
    *   `status` (string, required): สถานะงาน (`PENDING`, `COMPLETED`, `CANCELLED`)
    *   `isDraft` (boolean, optional): สถานะร่างงาน
    *   `createdAt` (number, required): วันสร้างงานระบบ

#### 5. Collection: `pig_sales` (PigSale)
บันทึกประวัติการจับขายสุกรรวมถึงการเซ็นใบรับสินค้าดิจิทัล
*   **Document ID**: อัตโนมัติ
*   **ฟิลด์ข้อมูล**:
    *   `userId` (string, required) / `recordedBy` (string)
    *   `date` (string, required): วันที่จับขาย
    *   `saleId` (string, required): เลขรหัสใบเสร็จ/การขาย
    *   `buyerName` (string, required): ชื่อผู้ซื้อ / พ่อค้าคนกลาง
    *   `buyerEmail` (string, optional): อีเมลสำหรับจัดส่งรายงาน
    *   `vehicleReg` (string, optional): ทะเบียนรถที่มารับหมู
    *   `paymentStatus` (string, required): สถานะรับเงิน (`PAID`=จ่ายแล้ว, `UNPAID`=ติดค้าง)
    *   `totalPigs` (number, required): จำนวนสุกรที่ขาย (ตัว)
    *   `pricePerKg` (number, required): ราคากิโลกรัมละ (บาท)
    *   `deductions` (number, optional): ค่าหักน้ำหนัก/ค่าคัดหัว
    *   `totalNetWeight` (number, required): น้ำหนักสุทธิรวมทั้งหมด (กก.)
    *   `averageWeight` (number, optional): น้ำหนักเฉลี่ยต่อตัว
    *   `grossTotal` (number, optional): มูลค่าก่อนหักค่าธรรมเนียม
    *   `netTotal` (number, required): รายรับสุทธิทั้งหมด (บาท)
    *   `signature` (string, optional): ลายเซ็นดิจิทัลในรูปแบบ Base64 Image
    *   `deliveryPhoto` (string, optional): ลิงก์ URL ของภาพถ่ายหลักฐานการขึ้นหมู/ส่งมอบที่บีบอัดแล้ว (เซฟพื้นที่คลาวด์)
    *   `createdAt` (number, required)

#### 6. Collection: `maintenance_requests` (MaintenanceRequest)
ตารางแจ้งซ่อมอุปกรณ์ชำรุด พัดลมเล้า บ่อบำบัด มอเตอร์ให้อาหาร
*   **Document ID**: อัตโนมัติ
*   **ฟิลด์ข้อมูล**:
    *   `userId` (string, required)
    *   `title` (string, required): หัวข้อแจ้งซ่อม
    *   `description` (string, required): อาการชำรุดโดยละเอียด
    *   `location` (string, required): พิกัดคอกเล้า/พื้นที่ฟาร์ม
    *   `imageUrl` (string, optional): รูปภาพความเสียหาย
    *   `status` (string, required): `PENDING` (รอรับ), `IN_PROGRESS` (กำลังซ่อม), `RESOLVED` (เสร็จสิ้น)
    *   `urgency` (string, required): ระดับความรีบด่วน (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)
    *   `reportedBy` (string, required): พนักงานผู้แจ้ง
    *   `createdAt` (number, required) / `resolvedAt` (number, optional)

#### 7. Collection: `feed_recipes` (FeedRecipe)
ตารางบันทึกการจัดส่วนผสมวัตถุดิบอาหารและคำนวณต้นทุนการผลิตรายสูตร
*   **Document ID**: อัตโนมัติ
*   **ฟิลด์ข้อมูล**:
    *   `userId` (string, required)
    *   `recipeName` (string, required): ชื่อสูตรผสมอาหาร (เช่น "สูตรแม่หมูอุ้มท้อง", "สูตรอนุบาล")
    *   `ingredients` (array of maps, required): รายการผสม (ชื่อ, จำนวนกก., ราคากก.)
    *   `totalWeight` (number, required): น้ำหนักรวมสูตร (กก.)
    *   `totalCost` (number, required): ราคารวมสูตร (บาท)
    *   `avgCostPerKg` (number, required): ราคาเฉลี่ยต่อกิโลกรัม (บาท)
    *   `createdAt` (number, required) / `updatedAt` (number, required)

#### 8. Collection: `bills` (Bill) และ `bill_items` (BillItem)
ตารางบิลส่งของวัตถุดิบและรายการแยกย่อยที่ประมวลผลมาจากระบบ AI OCR
*   **Bills (ตารางแม่)**:
    *   `userId`, `billDate` (string), `vendorName` (string), `imageUrl` (string), `totalAmount` (number), `recordedBy` (string), `createdAt`
*   **BillItems (ตารางลูก)**:
    *   `userId`, `billId` (เชื่อมโยงตารางบิลแม่), `description` (string - standard mapped), `quantity` (number), `unit` (string), `pricePerUnit` (number), `total` (number), `date` (string)

#### 9. Collection: `pig_prices` (PigPrice)
บันทึกราคาสุกรหน้าฟาร์มรายเดือน เพื่อเปรียบเทียบตลาด
*   **ฟิลด์ข้อมูล**: `userId`, `year` (number), `month` (number), `price` (number), `memo` (string), `recordedBy` (string), `createdAt`

#### 10. Collections อื่นๆ ด้านการสื่อสารและเงินเดือน:
*   `news_posts`: โพสต์ข่าวประชาสัมพันธ์ บันทึกความเคลื่อนไหวภายในทีม
*   `chat_rooms` & `chat_messages`: ห้องแชทส่วนตัว/กลุ่ม พร้อมระบุผู้ส่ง ข้อความ เวลา และสถานะการอ่าน
*   `employee_salaries` & `employee_transactions`: การเบิกค่าจ้างพนักงานล่วงหน้า (Salary Advance) และประวัติการจ่ายเงินเดือน

---

## 3. รายละเอียด API Endpoints หลังบ้าน (API Documentation)

ระบบรักษาความปลอดภัยโดยจำกัดไม่ให้คีย์ความลับ (เช่น Gemini API Key) หลุดไปยังฝั่งไคลเอนต์หน้าบ้าน จึงมีเซิร์ฟเวอร์หลังบ้านทำหน้าที่เป็น API Proxy และหน่วยประมวลผลโครงข่ายประสาทเทียม ดังนี้:

### 1. `GET /api/health`
ตรวจสอบสถานะความพร้อมใช้งานของเซิร์ฟเวอร์หลังบ้านและเช็คความพร้อมของ API Key
*   **พารามิเตอร์**: ไม่มี
*   **ผลลัพธ์ตอบกลับ (Response)**:
    ```json
    { 
      "status": "ok",
      "aiKeyReady": true
    }
    ```

### 2. `GET /api/weather`
ดึงข้อมูลสภาพอากาศและทิศทางลมในฟาร์มเพื่อใช้คำนวณการทำงานพัดลมไอน้ำ ป้องกันพายุ
*   **พารามิเตอร์คำขอ (Query Parameters)**:
    *   `latitude` (string/number, required): ละติจูดของพิกัดฟาร์ม
    *   `longitude` (string/number, required): ลองจิจูดของพิกัดฟาร์ม
*   **กระบวนการพิเศษ**:
    *   ระบบจะติดต่อไปยังผู้ให้บริการสภาพอากาศ **Open-Meteo API** แบบ Real-time
    *   **High-Availability Fallback**: กรณีที่เน็ตเวิร์กเซิร์ฟเวอร์สภาพอากาศล่ม หรือมีปัญหาระบบจะสลับไปดึงข้อมูลจำลองเสมือนจริงของสภาพอากาศภาคกลางของไทยทันที (30.5°C, ลมพัด 4.2 m/s ทิศตะวันออกเฉียงเหนือ) เพื่อไม่ให้หน้าจอพังหรือแสดงผลผิดพลาด
*   **ผลลัพธ์ตอบกลับ**:
    ```json
    {
      "current": {
        "temperature_2m": 31.2,
        "relative_humidity_2m": 68,
        "weather_code": 1,
        "wind_speed_10m": 5.1,
        "clouds": { "all": 45 },
        "wind": { "speed": 5.1, "deg": 90 }
      }
    }
    ```

### 3. `POST /api/receipt-analyze`
**ระบบ AI OCR สแกนบิลส่งวัตถุดิบอัจฉริยะ (Smart Raw-Material Invoicing Scanner)**
*   **พารามิเตอร์ส่งมา (JSON Body)**:
    ```json
    {
      "image": "data:image/jpeg;base64,...(รหัสภาพ Base64)",
      "historicalDescriptions": ["ปลายข้าวบด", "กากถั่วเหลือง(Tvo)"],
      "historicalVendors": ["สมศักดิ์พืชผล", "บริษัท ทวีทรัพย์อาหารสัตว์"]
    }
    ```
*   **กระบวนการวิเคราะห์อัจฉริยะ**:
    1.  **Rejection Rule (ป้องกันภาพหลุดเกรียน)**: วิเคราะห์ว่าเป็นภาพเอกสารทางการค้าหรือตารางรายการหรือไม่ หากส่งหน้าคน หมู ดอกไม้ วิว มา AI จะตรวจสอบเจอแล้วคัดทิ้งทันทีพร้อมปฏิเสธภาพอย่างสุภาพ (`isValidBill: false`)
    2.  **Fuzzy Mapping Dictionary**: ตัวจับคู่ความคล้ายสะกดคำ หากบิลเขียนย่อ เช่น "TVO" หรือ "กากถั่ว" ระบบจะสะกดคำกลับให้ถูกต้องตามฐานข้อมูลของฟาร์มเป๊ะๆ เป็น `"กากถั่วเหลือง(Tvo)"` ทันที
    3.  **Mathematical Audit**: คูณสอบความถูกต้องทางคณิตศาสตร์ในทุกๆ บรรทัด (`quantity` * `unitPrice` = `amount`) หากคนเขียนบิลเขียนเลขผลคูณผิดตัวระบบจะแจ้งในฟิลด์ `isLineValid: false`
    4.  **Failover Models**: มีระบบส่งต่อคิวงานให้โมเดล AI สำรองหากคิวงานโมเดลหลักติดขัด ลำดับโมเดล: `gemini-2.5-flash` -> `gemini-3.1-flash-lite` -> `gemini-3.5-flash` -> `gemini-flash-latest` (พยายามสูงสุดโมเดลละ 2 รอบ โดยเว้นระยะหน่วงเวลาอัตโนมัติ)
*   **ผลลัพธ์ตอบกลับ**:
    ```json
    {
      "isValidBill": true,
      "rejectionReason": "",
      "merchantName": "ห้างหุ้นส่วนสมศักดิ์พืชผลจำกัด",
      "date": "2026-06-30",
      "totalAmount": 12500,
      "items": [
        {
          "description": "กากถั่วเหลือง(Tvo)",
          "quantity": 10,
          "unitPrice": 1200,
          "amount": 12000,
          "isLineValid": true
        },
        {
          "description": "เกลือ",
          "quantity": 5,
          "unitPrice": 100,
          "amount": 500,
          "isLineValid": true
        }
      ],
      "isCorrect": true,
      "analysisNote": "บิลมีความถูกต้องทางคณิตศาสตร์ครบถ้วน และแปลงรหัสวัตถุดิบเข้าสากลเรียบร้อย"
    }
    ```

### 4. `POST /api/text-to-speech`
**ระบบสังเคราะห์เสียงพูดภาษาไทยธรรมชาติ (AI Text-To-Speech API)**
*   **พารามิเตอร์ส่งมา (JSON Body)**:
    ```json
    {
      "text": "แม่พันธุ์ N105 ครบกำหนดตรวจครรภ์พรุ่งนี้ค่ะ",
      "voice": "Zephyr"
    }
    ```
*   **กระบวนการ**:
    *   ส่งข้อความประมวลผลไปยังโมเดลโมดาลิตี้เสียงเฉพาะทาง `gemini-3.1-flash-tts-preview`
    *   สังเคราะห์สำเนียงภาษาไทยที่ชัดเจน เป็นธรรมชาติ นุ่มนวล
*   **ผลลัพธ์ตอบกลับ**:
    ```json
    {
      "audio": "UklGRuRvAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSBvAAA...(รหัสเสียง Base64 Audio)"
    }
    ```

### 5. `GET /api/proxy`
แก้ปัญหาข้อจำกัด CORS (Cross-Origin Resource Sharing) เมื่อเบราว์เซอร์ไคลเอนต์ต้องการวาดภาพโปรไฟล์ ลายเซ็นต์ หรือรูปภาพอัปโหลดบิลที่เก็บในพื้นที่จัดเก็บภายนอกลงบน HTML5 Canvas
*   **พารามิเตอร์คำขอ (Query Parameters)**:
    *   `url` (string, required): ที่อยู่ของภาพภายนอก
*   **ผลลัพธ์ตอบกลับ**: ส่งข้อมูล Buffer ของภาพกลับไปพร้อมเซ็ต Header `Access-Control-Allow-Origin: *` และ `Content-Type` ที่สอดคล้องกับไฟล์ภาพจริง

---

## 4. มาตรการความปลอดภัยของข้อมูล (Data Security)

*   **API Key Isolation**: คีย์ Google Gemini API Key ทั้งหมดถูกฝังอยู่ที่ Environment Server-side ของ Google Cloud Run ในรูปแบบของตัวแปรลับ (Secret Environment Variable) จะไม่มีการเปิดเผยหรือรั่วไหลไปยังรหัสเบราว์เซอร์หน้าบ้านเด็ดขาด
*   **Database Isolation Rules (`firestore.rules`)**:
    *   ห้ามเขียนอ่านข้อมูลข้ามฟาร์ม โดยผู้ใช้จะสามารถเข้าถึงได้เฉพาะเอกสารที่มี `userId == request.auth.uid` เท่านั้น
    *   จำกัดไม่ให้พนักงานที่มีสถานะ `PENDING` หรือลาออก `RESIGNED` สามารถเข้าถึงข้อมูลสำคัญหรือทำการแก้ไขสถานะแม่พันธุ์ได้
    *   ข้อมูลบัญชีเงินเดือนและประวัติธุรกรรมเบิกพนักงาน ถูกจำกัดสิทธิ์สูงสุดให้ผู้ใช้สิทธิ์ `ADMIN` เข้าถึงเพื่อแก้ไขหรือบันทึกอนุมัติเท่านั้น

*   **ระบบคลังภาพจัดเก็บหลัก (Image Storage Gateway)**:
    *   ระบบได้รับการกำหนดค่าให้ใช้ **ImageKit.io** เป็นบริการคลังภาพหลักผ่านตัวแปรสภาพแวดล้อม: `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY` และ `IMAGEKIT_URL_ENDPOINT`
    *   เมื่อมีการเรียกใช้ภาพถ่าย เช่น หลักฐานจับขี่/ขึ้นสุกร (`deliveryPhoto`), สลิปโอนเงินเดือน, สลิปโอนเงินเบิกล่วงหน้า หรือรูปภาพบันทึกอาการป่วย/วัคซีนของแม่พันธุ์ (`attachmentUrl`) ตัวระบบจะทำความสะอาด/ย่อขนาดผ่าน Image Optimizer ที่ฝั่ง Client ให้เป็นไฟล์ชนิด WebP ขนาด 200KB-400KB และส่งผ่าน Gateway API `/api/upload-gateway` ไปยัง ImageKit.io โดยอัตโนมัติ เพื่อประหยัดพื้นที่จัดเก็บและลดความหน่วงในเว็บแอปพลิเคชัน
    *   หากบริการ ImageKit ไม่ได้ถูกตั้งค่าหรือขัดข้อง ระบบจะปรับปรุงตัวเองเป็น Native Fallback โดยการสตรีมพิกเซลตรงไปยัง Google Firebase Storage ทันทีเพื่อความทนทาน 100%
    *   ไม่มีการเรียกใช้งานระบบ Cloudinary อีกต่อไปเพื่อรักษาความเรียบง่ายของระบบตามนโยบายของ นิพนธ์ฟาร์ม

---
จัดทำโดย: **ระบบ AI Coding Agent (AI Studio Build)**
ปรับปรุงล่าสุด: **10 กรกฎาคม 2026**

