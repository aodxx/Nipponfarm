import express from "express";
import path from "path";
import { Type } from "@google/genai";
import dotenv from "dotenv";
import { aiModels, createAiClient, getAiProviderName, isAiConfigured } from "./server/aiProvider";
import { requireFirebaseAuth, verifyFirebaseIdToken } from "./server/firebaseAuth";


dotenv.config();

export async function createApp(options: { serveFrontend?: boolean } = {}) {
  const { serveFrontend = true } = options;
  const app = express();

  app.use(express.json({ limit: "50mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      aiProvider: getAiProviderName(),
      aiReady: isAiConfigured()
    });
  });

  app.get("/api/weather", async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      if (!latitude || !longitude) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
      }

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,cloud_cover,wind_direction_10m&timezone=Asia%2FBangkok`;
      
      try {
        const response = await fetch(url);
        if (!response.ok) {
          console.warn(`Weather API responded with status ${response.status}. Using high-availability fallback data.`);
          return res.json({
            isFallback: true,
            current: {
              temperature_2m: 30.5,
              relative_humidity_2m: 76,
              weather_code: 3, // มีเมฆบางส่วน
              wind_speed_10m: 4.2,
              cloud_cover: 96,
              wind_direction_10m: 45,
              clouds: {
                all: 96
              },
              wind: {
                speed: 4.2,
                deg: 45
              }
            }
          });
        }
        
        const data = await response.json();
        
        // Inject OpenWeatherMap compatible JSON structure
        if (data && data.current) {
          data.current.clouds = {
            all: data.current.cloud_cover ?? 0
          };
          data.current.wind = {
            speed: data.current.wind_speed_10m ?? 0,
            deg: data.current.wind_direction_10m ?? 0
          };
        }
        
        res.json(data);
      } catch (fetchErr: any) {
        console.warn("Weather API fetch error, returning high-availability fallback:", fetchErr.message);
        res.json({
          isFallback: true,
          current: {
            temperature_2m: 30.5,
            relative_humidity_2m: 76,
            weather_code: 3,
            wind_speed_10m: 4.2,
            cloud_cover: 96,
            wind_direction_10m: 45,
            clouds: {
              all: 96
            },
            wind: {
              speed: 4.2,
              deg: 45
            }
          }
        });
      }
    } catch (error: any) {
      console.error("Proxy Weather Error:", error);
      res.status(500).json({ error: "Failed to fetch weather data from provider", details: error.message });
    }
  });

  app.post("/api/receipt-analyze", requireFirebaseAuth, async (req, res) => {
    console.log("-> Starting receipt analysis handler with fallback and retries");
    try {
      const { image, historicalDescriptions, historicalVendors } = req.body;
      
      if (!image) {
        console.error("API Error: No image data provided in request body");
        return res.status(400).json({ error: "ไม่พบข้อมูลรูปภาพในคำขอ" });
      }

      const apiKey = process.env.CENTRAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.error("Server Error: No Gemini API Key defined in environment variables (checked CENTRAL_GEMINI_API_KEY and GEMINI_API_KEY)");
        return res.status(500).json({ error: "เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า API Key (โปรดตั้งค่า CENTRAL_GEMINI_API_KEY ใน Settings > Secrets)" });
      }

      const ai = createAiClient();

      // Strip potential data URL prefix from base64 string
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      // Standardized lists for Pig Farm (วัตถุดิบและยา/วิตามิน)
      const standardProductsList = [
        "ปลายข้าว (บดละเอียด)",
        "ปลายข้าว (เมล็ด)",
        "ข้าวโพด",
        "กากถั่วเหลือง(Tvo)",
        "ถั่วอบ",
        "รำ",
        "ปลาบด",
        "วิตามินรวม",
        "เกลือ",
        "ไซลีน โมโนไฮโดรคลอ",
        "แอสไทมูลิน10",
        "วัน-มิกซ์(One-Mix)",
        "โปรแลค มอร์",
        "วันฟรีมิกซ์",
        "นม"
      ];

      // Smart Abbreviation and Alias mapping dictionary for fuzzy matching
      const abbreviationMappings = `
ABBREVIATIONS & ALIASES MAPPING DICTIONARY (CRITICAL FOR FUZZY MATCHING):
If you find any of the following abbreviations, short codes, or synonyms on the bill, you MUST automatically rewrite and expand them to the standard catalog name:
- "Tvo", "TVO", "กากถั่ว", "ถั่วเหลืองบด" -> Map to: "กากถั่วเหลือง(Tvo)"
- "One-Mix", "วันมิกซ์", "วัน มิกซ์", "1-Mix" -> Map to: "วัน-มิกซ์(One-Mix)"
- "ปลายบด", "ปลายละเอียด", "ปลายข้าวบด" -> Map to: "ปลายข้าว (บดละเอียด)"
- "ปลายเมล็ด", "ปลายข้าวเม็ด", "ปลายหยาบ" -> Map to: "ปลายข้าว (เมล็ด)"
- "รำละเอียด", "รำหยาบ", "รำข้าว" -> Map to: "รำ"
- "แอสไท", "แอสไทมูลิน", "Astymulin" -> Map to: "แอสไทมูลิน10"
- "ไซลีน", "ไซลีนโมโน", "Xylene" -> Map to: "ไซลีน โมโนไฮโดรคลอ"
- "โปรแลค", "Prolac" -> Map to: "โปรแลค มอร์"
- "วันฟรี", "วันพรี", "One Free" -> Map to: "วันฟรีมิกซ์"
- "นมผง", "นมวัว", "นมเลี้ยงหมู" -> Map to: "นม"
- "วิตามิน", "ยาบำรุง", "Vitรวม" -> Map to: "วิตามินรวม"
`;

      const standardProductsString = `\n\nSTANDARD PRODUCT CATALOG (CRITICAL LEARNED CONTEXT):\nThese are standardized item names for our pig farm. If you find a handwriting or printed item description that matches or is highly similar to these names, you MUST correct and map its spelling to match this list EXACTLY:\n- ${standardProductsList.join('\n- ')}\n${abbreviationMappings}`;

      const historicalContextString = historicalDescriptions && historicalDescriptions.length > 0
        ? `\n\nHISTORICAL PRODUCT NAMES (PREVIOUS TRANSACTIONS):\nThese are other product names from previous bills. Prefer these exact strings if they align with the scanned text: ${historicalDescriptions.join(', ')}.`
        : '';

      const vendorMemoryString = historicalVendors && historicalVendors.length > 0
        ? `\n\nHISTORICAL VENDOR/MERCHANT NAMES (VENDOR SMART MEMORY):\nThese are the standardized merchant names the pig farm frequently purchases from. If the merchant name written or stamped on the bill has spelling errors, typos, or looks slightly different, please auto-correct it to match one of these standard vendor names EXACTLY:\n- ${historicalVendors.join('\n- ')}`
        : '';

      const prompt = `Analyze this handwriting or printed image of a "Delivery Bill" (ใบส่งของ) or raw material receipt.
  
  CRITICAL VULNERABILITY PREVENTER & LOOPHOLE RESTRICTION RULE:
  You MUST visually inspect and classify whether this image is a valid invoice, delivery bill, list statement, or receipt containing a clear tabular structure (or rows of items), prices, quantities, and item descriptions.
  - Set "isValidBill" to true ONLY if it is an actual physical/digital document showing purchase items, prices, and quantities (such as farm ingredients, feeds, or related purchases).
  - Set "isValidBill" to false if it is a general photograph (such as animals like pigs/cattle, trees, scenery, landscapes, human faces, food plates, unrelated physical goods, random text/scribbles, or documents lacking tabular/itemized lists with numerical prices).
  - If "isValidBill" is false, you MUST set "rejectionReason" to a polite and clear explanation in Thai (e.g., "ภาพที่ส่งมาไม่ใช่รูปภาพบิลส่งของหรือใบเสร็จรับเงินที่ถูกต้อง กรุณาอัปโหลดบิลที่มีรายละเอียดตารางรายการสินค้าและราคาสินค้าอย่างชัดเจน"), set "merchantName" to "", "totalAmount" to 0, and "items" to [].

  1. EXTRACT METADATA:
     - merchantName: Found at the top header or in a stamp. VERY IMPORTANT: DO NOT extract generic document titles like "ใบส่งของ", "DELIVERY BILL", "ใบเสร็จรับเงิน", "บิล", "RECEIPT", "ใบรับของ" as the merchantName. If there is no specific shop/store name printed, written, or stamped on the bill, you MUST set "merchantName" to "".
     - date: Usually at the top right (e.g., 30/3/69 means 30 March 2569).
     - totalAmount: The final TOTAL (รวมเงิน) found at the bottom right.
  
  2. EXTRACT TABLE ITEMS (Look for these columns from left to right):
     - quantity (จำนวน): Number of items.
     - description (รายการ): Name of product.
     - unitPrice (หน่วยละ): Price per one unit.
     - amount (จำนวนเงิน): Total for that row.
  
  3. KNOWLEDGE & CONTEXT:${standardProductsString}${historicalContextString}${vendorMemoryString}
  
  4. MATHEMATICAL CROSS-CHECK (AUDIT):
     - For EACH line: verify if (quantity * unitPrice) equals the "amount" written on the bill.
     - If it does NOT match, set isLineValid to false.
     - Verify if Sum(amounts) matches the totalAmount.
  
  5. Provide an "analysisNote" in Thai. If the merchant wrote the wrong math, flag it clearly.
  6. Return valid JSON only.`;

      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data,
        },
      };

      // Robust fallback list of models with automated retries
      const candidateModels = Array.from(new Set([
        aiModels.vision,
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash",
        "gemini-flash-latest"
      ]));
      let lastError: any = null;
      let finalResponse: any = null;
      let successfullyUsedModel = "";

      for (const modelName of candidateModels) {
        console.log(`Trying receipt analysis with model: ${modelName}`);
        const maxRetries = 2;
        let success = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: { parts: [imagePart, { text: prompt }] },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    isValidBill: { type: Type.BOOLEAN },
                    rejectionReason: { type: Type.STRING },
                    merchantName: { type: Type.STRING },
                    date: { type: Type.STRING },
                    totalAmount: { type: Type.NUMBER },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          description: { type: Type.STRING },
                          quantity: { type: Type.NUMBER },
                          unitPrice: { type: Type.NUMBER },
                          amount: { type: Type.NUMBER },
                          isLineValid: { type: Type.BOOLEAN }
                        }
                      }
                    },
                    isCorrect: { type: Type.BOOLEAN },
                    analysisNote: { type: Type.STRING }
                  },
                  required: ["isValidBill", "rejectionReason", "merchantName", "totalAmount", "isCorrect", "analysisNote", "items"]
                }
              }
            });

            if (response && response.text) {
              finalResponse = response;
              successfullyUsedModel = modelName;
              success = true;
              console.log(`Successfully completed receipt analysis using model ${modelName} on attempt ${attempt}`);
              break;
            }
            throw new Error("Empty response text from AI model");
          } catch (err: any) {
            lastError = err;
            const errMsg = err.message || String(err);
            console.warn(`Attempt ${attempt} with model ${modelName} failed:`, errMsg);

            if (attempt < maxRetries) {
              const delay = attempt * 1000;
              console.log(`Waiting ${delay}ms before retrying ${modelName}...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        if (success) {
          break;
        }
      }

      if (!finalResponse) {
        throw lastError || new Error("All candidate models and retries failed to generate content");
      }

      let resultText = finalResponse.text || "{}";
      
      // Clean up potential markdown formatting from Gemini
      resultText = resultText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

      let result;
      try {
        result = JSON.parse(resultText);
      } catch (parseError) {
        console.error(`JSON Parse Error with model ${successfullyUsedModel}. Raw response:`, resultText);
        return res.status(500).json({ error: "รูปแบบข้อมูลที่ตอบกลับจาก AI ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Server Analysis Error:", error);
      
      let friendlyError = "การวิเคราะห์ล้มเหลว โปรดตรวจสอบว่าบิลภาพชัดเจนหรือไม่";
      const errorStr = String(error?.message || error);
      
      if (errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("depleted")) {
        friendlyError = "API Key ที่ใช้งานหมดโควต้า/เครดิต (Quota Exceeded) โปรดตรวจสอบผู้ให้บริการ AI ที่ตั้งค่าไว้";
      } else if (errorStr.includes("API_KEY_INVALID")) {
        friendlyError = "API Key ไม่ถูกต้อง โปรดตรวจสอบ API Key ในช่อง Settings > Secrets อีกครั้ง";
      } else if (errorStr.includes("503") || errorStr.includes("UNAVAILABLE")) {
        friendlyError = "ระบบเซิร์ฟเวอร์ AI มีผู้ใช้งานเป็นจำนวนมากในขณะนี้ กรุณากดปุ่มเพื่อลองใหม่อีกครั้ง";
      }

      res.status(500).json({ error: friendlyError, details: errorStr });
    }
  });

  app.post("/api/text-to-speech", requireFirebaseAuth, async (req, res) => {
    try {
      const { text, voice } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Missing text to synthesize" });
      }

      const apiKey = process.env.CENTRAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const ai = createAiClient();

      const voiceName = voice || 'Zephyr'; // Puck, Charon, Kore, Fenrir, Zephyr

      const response = await ai.models.generateContent({
        model: aiModels.speech,
        contents: [{ parts: [{ text: `Say naturally and clearly in Thai: ${text}` }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.status(500).json({ error: "Failed to generate audio from Gemini" });
      }

      res.json({ audio: base64Audio });
    } catch (err: any) {
      console.error("TTS generation error:", err);
      res.status(500).json({ error: err.message || "Failed to synthesize speech" });
    }
  });

  app.post("/api/send-welcome-email", async (req, res) => {
    try {
      const { email, employeeName, salary, jobTitle } = req.body;
      if (!email || !employeeName) {
        return res.status(400).json({ error: "Missing email or employeeName" });
      }

      const formattedSalary = salary ? Number(salary).toLocaleString('th-TH', { style: 'currency', currency: 'THB' }) : "ยังไม่ได้ระบุ";
      const displayJobTitle = jobTitle || "พนักงานทั่วไป (STAFF)";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 0; margin: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #0a2e36 0%, #021a1f 100%); padding: 40px 32px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 26px; font-weight: bold; letter-spacing: -0.5px; }
            .header p { margin: 10px 0 0 0; font-size: 14px; opacity: 0.85; }
            .content { padding: 40px 32px; line-height: 1.7; }
            .greeting { font-size: 18px; font-weight: bold; margin-bottom: 16px; color: #0f172a; }
            .message { font-size: 15px; margin-bottom: 24px; color: #475569; }
            .info-card { background-color: #f8fafc; border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
            .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px dashed #cbd5e1; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: bold; color: #64748b; font-size: 14px; }
            .info-value { font-weight: bold; color: #0f172a; font-size: 14px; text-align: right; }
            .footer { padding: 24px; background-color: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
            .btn { display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; margin-top: 16px; box-shadow: 0 4px 12px rgba(16,185,129,0.2); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ยินดีต้อนรับสู่นิพนธ์ฟาร์ม</h1>
              <p>ระบบบริหารจัดการฟาร์มสุกรอัจฉริยะ (Nipon Farm Management)</p>
            </div>
            <div class="content">
              <div class="greeting">สวัสดีครับ คุณ ${employeeName},</div>
              <div class="message">
                ทางฝ่ายบุคคลและผู้ดูแลระบบ นิพนธ์ฟาร์ม มีความยินดีเป็นอย่างยิ่งที่จะแจ้งให้ทราบว่า บัญชีผู้ใช้งานระบบของคุณได้รับการอนุมัติเปิดสิทธิ์เข้าใช้งานเรียบร้อยแล้ว และขอต้อนรับคุณเข้าสู่ทีมงานของเราอย่างเป็นทางการ!
              </div>
              
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">ชื่อพนักงาน:</span>
                  <span class="info-value">${employeeName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">ตำแหน่ง:</span>
                  <span class="info-value">${displayJobTitle}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">อัตราเงินเดือนเริ่มต้น:</span>
                  <span class="info-value" style="color: #10b981; font-size: 16px;">${formattedSalary}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">สถานะสิทธิ์ในแอป:</span>
                  <span class="info-value" style="color: #10b981;">ใช้งานได้ปกติ (STAFF)</span>
                </div>
              </div>

              <div class="message">
                คุณสามารถล็อกอินเข้าสู่แอปพลิเคชันระบบบริหารจัดการฟาร์มสุกรเพื่อปฏิบัติงาน บันทึกข้อมูลแม่หมู ตรวจสอบปฏิทินงานรายวัน และทำรายการเบิกเงินเดือนล่วงหน้าได้ทันทีครับ
              </div>

              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="btn">เข้าใช้งานระบบนิพนธ์ฟาร์ม</a>
              </div>
            </div>
            <div class="footer">
              <p>จดหมายฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ นิพนธ์ฟาร์ม</p>
              <p>© 2026 นิพนธ์ฟาร์ม - Nipon Farm. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Check for SMTP config
      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || '"Nipon Farm Admin" <noreply@niponfarm.com>';

      console.log(`[SMTP Welcome Email] Processing for ${email} (${employeeName}) with salary ${formattedSalary}`);

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
          subject: `ยินดีต้อนรับสู่นิพนธ์ฟาร์ม! บัญชีของคุณได้รับการอนุมัติแล้ว (เงินเดือนเริ่มต้น: ${formattedSalary})`,
          html: htmlContent
        });

        console.log(`[SMTP Welcome Email] Sent successfully via SMTP server to ${email}`);
        return res.json({ success: true, method: "smtp", message: "ส่งอีเมลต้อนรับสำเร็จผ่านเซิร์ฟเวอร์ SMTP" });
      } else {
        // Fallback simulation (logging to console and returning success with preview for demo safety)
        console.log("==========================================================");
        console.log("             SMTP SIMULATED WELCOME EMAIL LOG             ");
        console.log("==========================================================");
        console.log(`To: ${email}`);
        console.log(`Subject: ยินดีต้อนรับสู่นิพนธ์ฟาร์ม! บัญชีของคุณได้รับการอนุมัติแล้ว (เงินเดือนเริ่มต้น: ${formattedSalary})`);
        console.log(`Body (Preview): คุณ ${employeeName} ได้รับสิทธิ์เป็น STAFF มีเงินเดือน ${formattedSalary}`);
        console.log("==========================================================");

        return res.json({
          success: true,
          method: "simulation",
          message: "ระบบจำลองการส่งอีเมลต้อนรับสำเร็จ (เนื่องจากไม่ได้ระบุข้อมูล SMTP_HOST ใน Secrets ของแอป) บันทึกประวัติในเซิร์ฟเวอร์เรียบร้อย",
          emailPreview: {
            to: email,
            subject: `ยินดีต้อนรับสู่นิพนธ์ฟาร์ม! บัญชีของคุณได้รับการอนุมัติแล้ว`,
            salary: formattedSalary,
            jobTitle: displayJobTitle
          }
        });
      }
    } catch (err: any) {
      console.error("Error sending welcome email:", err);
      res.status(500).json({ error: "ไม่สามารถส่งอีเมลได้", details: err.message });
    }
  });

  app.post("/api/send-payslip-email", async (req, res) => {
    try {
      const {
        email,
        employeeName,
        month,
        period,
        baseSalary,
        advances,
        customIncome,
        customDeductions,
        netSalary,
        bankName,
        accountNumber,
        status,
        slipImage
      } = req.body;

      if (!email || !employeeName) {
        return res.status(400).json({ error: "Missing email or employeeName" });
      }

      const formattedBase = Number(baseSalary || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });
      const formattedAdvances = Number(advances || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });
      const formattedIncome = Number(customIncome || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });
      const formattedDeductions = Number(customDeductions || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });
      const formattedNet = Number(netSalary || 0).toLocaleString('th-TH', { style: 'currency', currency: 'THB' });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 0; margin: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 35px 32px; text-align: center; color: #ffffff; }
            .header h1 { margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px; }
            .header p { margin: 8px 0 0 0; font-size: 13px; opacity: 0.85; }
            .content { padding: 35px 32px; line-height: 1.6; }
            .greeting { font-size: 16px; font-weight: bold; margin-bottom: 12px; color: #0f172a; }
            .message { font-size: 14px; margin-bottom: 20px; color: #475569; }
            .slip-card { background-color: #f8fafc; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
            .slip-title { font-size: 15px; font-weight: bold; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; color: #0f172a; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px dashed #e2e8f0; }
            .row:last-child { border-bottom: none; }
            .label { color: #64748b; }
            .val { font-weight: bold; color: #0f172a; }
            .total-row { display: flex; justify-content: space-between; padding: 15px 0 0 0; margin-top: 10px; border-top: 2px solid #e2e8f0; }
            .total-label { font-size: 15px; font-weight: bold; color: #0f172a; }
            .total-val { font-size: 20px; font-weight: 900; color: #10b981; }
            .bank-info { font-size: 12px; color: #64748b; background-color: #f1f5f9; padding: 12px; border-radius: 8px; margin-top: 15px; text-align: center; }
            .status-paid { color: #10b981; font-weight: bold; }
            .status-pending { color: #f59e0b; font-weight: bold; }
            .footer { padding: 20px; background-color: #f8fafc; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ใบแจ้งยอดเงินเดือน (Payslip)</h1>
              <p>นิพนธ์ฟาร์ม - ระบบจัดการพนักงานและค่าตอบแทนอัตโนมัติ</p>
            </div>
            <div class="content">
              <div class="greeting">เรียน คุณ ${employeeName},</div>
              <div class="message">
                ระบบได้ดำเนินการประมวลผลและออกสลิปเงินเดือนของคุณสำหรับรอบเดือน <strong>${month}</strong> งวดการจ่ายที่ <strong>${period}</strong> เรียบร้อยแล้ว รายละเอียดค่าตอบแทนและการหักมีดังต่อไปนี้:
              </div>

              <div class="slip-card">
                <div class="slip-title">สรุปรายการเงินเดือน (งวดที่ ${period})</div>
                
                <div class="row">
                  <span class="label">ฐานเงินเดือน (ประจำงวด):</span>
                  <span class="val">${formattedBase}</span>
                </div>
                
                <div class="row">
                  <span class="label">รายรับพิเศษ / โบนัส:</span>
                  <span class="val" style="color: #10b981;">+ ${formattedIncome}</span>
                </div>

                <div class="row">
                  <span class="label">หัก: เบิกล่วงหน้า:</span>
                  <span class="val" style="color: #ef4444;">- ${formattedAdvances}</span>
                </div>

                <div class="row">
                  <span class="label">หัก: รายจ่ายอื่นๆ:</span>
                  <span class="val" style="color: #ef4444;">- ${formattedDeductions}</span>
                </div>

                <div class="row">
                  <span class="label">สถานะการจ่ายเงิน:</span>
                  <span class="val ${status === 'PAID' ? 'status-paid' : 'status-pending'}">
                    ${status === 'PAID' ? 'จ่ายเงินเรียบร้อยแล้ว (PAID)' : 'รอดำเนินการ (PENDING)'}
                  </span>
                </div>

                <div class="total-row">
                  <span class="total-label">ยอดรับสุทธิ (Net Salary):</span>
                  <span class="total-val">${formattedNet}</span>
                </div>

                ${bankName ? `
                  <div class="bank-info">
                    <strong>โอนเข้าบัญชี:</strong> ${bankName} (${accountNumber})
                  </div>
                ` : ''}
              </div>

              <div class="message" style="font-size: 13px; text-align: center;">
                หากคุณมีข้อสงสัยหรือต้องการตรวจสอบรายละเอียดเพิ่มเติม กรุณาติดต่อฝ่ายบุคคล นิพนธ์ฟาร์ม
              </div>
            </div>
            <div class="footer">
              <p>จดหมายฉบับนี้เป็นการแจ้งยอดรายได้อัตโนมัติจากระบบ นิพนธ์ฟาร์ม กรุณาอย่าตอบกลับอีเมลนี้</p>
              <p>© 2026 นิพนธ์ฟาร์ม - Nipon Farm. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || '"ฝ่ายบุคคล นิพนธ์ฟาร์ม" <Pantipa3826@gmail.com>';

      console.log(`[SMTP Payslip Email] Processing for ${email} (${employeeName}) for ${month} Period ${period}`);

      const attachments: any[] = [];
      let finalHtml = htmlContent;

      if (slipImage && slipImage.startsWith('data:image/')) {
        const match = slipImage.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const base64Data = match[2];
          const filename = `slip_${month.replace(/\s+/g, '_')}_period${period}.png`;

          attachments.push({
            filename,
            content: Buffer.from(base64Data, 'base64'),
            contentType,
            cid: 'bankslipImage'
          });

          // Embed the image inside HTML body
          finalHtml = htmlContent.replace(
            '<div class="footer">',
            `<div class="slip-card" style="margin-top: 25px;">
               <div class="slip-title">หลักฐานการโอนเงิน (Bank Transfer Slip)</div>
               <div style="text-align: center; margin: 15px 0;">
                 <img src="cid:bankslipImage" style="max-width: 100%; max-height: 400px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;" alt="สลิปโอนเงิน" />
               </div>
             </div>
             <div class="footer">`
          );
        }
      }

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
          subject: `ใบแจ้งสลิปเงินเดือน รอบเดือน${month} (งวดที่ ${period}) - คุณ ${employeeName}`,
          html: finalHtml,
          attachments
        });

        console.log(`[SMTP Payslip Email] Sent successfully via SMTP to ${email}`);
        return res.json({ success: true, message: "ส่งสลิปเงินเดือนไปยังอีเมลพนักงานสำเร็จ" });
      } else {
        console.log("==========================================================");
        console.log("             SMTP SIMULATED PAYSLIP EMAIL LOG             ");
        console.log("==========================================================");
        console.log(`To: ${email}`);
        console.log(`Subject: ใบแจ้งสลิปเงินเดือน รอบเดือน${month} (งวดที่ ${period}) - คุณ ${employeeName}`);
        console.log(`Net Salary: ${formattedNet}`);
        if (slipImage) {
          console.log(`Slip Image: Included (Base64 length: ${slipImage.length})`);
        }
        console.log("==========================================================");

        return res.json({
          success: true,
          method: "simulation",
          message: "ระบบจำลองการส่งสลิปเงินเดือนเนื่องจากไม่มีข้อมูล SMTP",
        });
      }
    } catch (err: any) {
      console.error("Error sending payslip email:", err);
      res.status(500).json({ error: "ไม่สามารถส่งสลิปเงินเดือนได้", details: err.message });
    }
  });

  app.post("/api/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Missing email to send test to" });
      }

      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const from = process.env.SMTP_FROM || '"Nipon Farm Test" <noreply@niponfarm.com>';

      if (!host || !user || !pass) {
        return res.status(400).json({ error: "Missing SMTP configuration in environment variables" });
      }

      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      const info = await transporter.sendMail({
        from,
        to: email,
        subject: "ทดสอบการเชื่อมต่อระบบอีเมล SMTP - นิพนธ์ฟาร์ม",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; }
              .card { max-width: 500px; margin: 40px auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
              h1 { color: #10b981; font-size: 22px; margin-top: 0; }
              p { line-height: 1.6; font-size: 14px; color: #475569; }
              .footer { font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>📧 ทดสอบระบบ SMTP สำเร็จเรียบร้อย!</h1>
              <p>ยินดีด้วยครับ ระบบส่งอีเมลแจ้งเตือนของ <strong>นิพนธ์ฟาร์ม</strong> เชื่อมต่อกับ Gmail SMTP ของคุณสำเร็จอย่างสมบูรณ์แล้ว</p>
              <p><strong>รายละเอียดการกำหนดค่า:</strong></p>
              <ul>
                <li><strong>SMTP Host:</strong> ${host}</li>
                <li><strong>SMTP Port:</strong> ${port}</li>
                <li><strong>ผู้ส่ง (SMTP User):</strong> ${user}</li>
              </ul>
              <p>ระบบพร้อมทำงานในการส่งอีเมลแจ้งเงินเดือนและต้อนรับพนักงานใหม่แล้วครับ!</p>
              <div class="footer">ส่งโดยระบบอัตโนมัติ นิพนธ์ฟาร์ม</div>
            </div>
          </body>
          </html>
        `
      });

      console.log(`[SMTP Test Email] Test email sent successfully to ${email}`);
      res.json({ success: true, message: "เชื่อมต่อและส่งอีเมลทดสอบสำเร็จแล้ว!", info });
    } catch (err: any) {
      console.error("SMTP Test Email Error:", err);
      res.status(500).json({ error: "ไม่สามารถส่งอีเมลทดสอบได้", details: err.message });
    }
  });

  app.post("/api/trigger-daily-tasks-alert", async (req, res) => {
    try {
      console.log("[API Endpoint] Manual trigger of Daily Breeding Tasks Alert received.");
      const { triggerDailyTasksAlert } = await import("./server/dailyTasksAlert");
      const result = await triggerDailyTasksAlert();
      res.json({
        success: true,
        message: "ดำเนินการจำลอง/ส่งอีเมลรายงานตารางงานรายวันเรียบร้อยแล้ว",
        result
      });
    } catch (err: any) {
      console.error("[API Endpoint] Error manually triggering daily tasks alert:", err);
      res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการรันระบบส่งตารางงานดูแลแม่หมูรายวัน",
        details: err.message
      });
    }
  });

  app.get("/api/cron/daily-tasks", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ success: false, error: "Unauthorized cron request" });
    }

    try {
      const { triggerDailyTasksAlert } = await import("./server/dailyTasksAlert");
      const result = await triggerDailyTasksAlert();
      return res.json({ success: true, result });
    } catch (err: any) {
      console.error("[Vercel Cron] Daily tasks alert failed:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ---------------------------------------------------------
  // Cloudflare R2 Video Storage Endpoints
  // ---------------------------------------------------------
  app.post("/api/r2/presign-upload", async (req, res) => {
    const { userId, contentType, key } = req.body;
    try {
      if (!userId) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ userId เพื่อตรวจสอบสิทธิ์" });
      }
      if (!contentType) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ contentType ของไฟล์" });
      }
      if (!key) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ key สำหรับเก็บไฟล์" });
      }

      const { getUploadPresignedUrl, verifyUserIsActive } = await import("./server/r2Service");

      // Check role permissions (must be ACTIVE ADMIN or STAFF)
      const isAuthorized = await verifyUserIsActive(userId);
      if (!isAuthorized) {
        return res.status(403).json({ 
          success: false, 
          error: "คุณไม่มีสิทธิ์อัปโหลดวิดีโอ (สถานะบัญชีต้องเป็นพนักงานหรือผู้บริหารที่ได้รับการอนุมัติ)" 
        });
      }

      const presignedData = await getUploadPresignedUrl(key, contentType);
      res.json({
        success: true,
        uploadUrl: presignedData.url,
        key: presignedData.key
      });
    } catch (err: any) {
      console.error("[API R2] Error generating upload URL:", err);
      res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการสร้าง Presigned URL ขาอัปโหลด",
        details: err.message
      });
    }
  });

  app.post("/api/r2/presign-download", async (req, res) => {
    const { userId, key } = req.body;
    try {
      if (!userId) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ userId เพื่อตรวจสอบสิทธิ์" });
      }
      if (!key) {
        return res.status(400).json({ success: false, error: "กรุณาระบุ key/URL ของไฟล์วิดีโอ" });
      }

      const { getDownloadPresignedUrl, verifyUserIsActive, extractKeyFromUrl } = await import("./server/r2Service");

      // Check role permissions (must be ACTIVE ADMIN or STAFF)
      const isAuthorized = await verifyUserIsActive(userId);
      if (!isAuthorized) {
        return res.status(403).json({ 
          success: false, 
          error: "คุณไม่มีสิทธิ์เข้าดูวิดีโอส่วนตัวนี้ (กรุณาลงชื่อเข้าใช้งาน)" 
        });
      }

      // If key is a full URL, extract the R2 key from it
      let r2Key = key;
      if (key.startsWith("http")) {
        const extracted = extractKeyFromUrl(key);
        if (extracted) {
          r2Key = extracted;
        } else {
          // Fallback parsing
          try {
            const urlObj = new URL(key);
            const pathParts = urlObj.pathname.split("/").filter(Boolean);
            if (pathParts.length > 1 && pathParts[0] === "niphon-farm-videos") {
              r2Key = pathParts.slice(1).join("/");
            } else {
              r2Key = pathParts.join("/");
            }
          } catch {
            r2Key = key.split("/").slice(-2).join("/");
          }
        }
      }

      const downloadUrl = await getDownloadPresignedUrl(r2Key);
      res.json({
        success: true,
        downloadUrl
      });
    } catch (err: any) {
      console.error("[API R2] Error generating download URL:", err);
      res.status(500).json({
        success: false,
        error: "เกิดข้อผิดพลาดในการสร้าง Presigned URL ขาดาวน์โหลด",
        details: err.message
      });
    }
  });

  // ---------------------------------------------------------
  // AI Swine Breeding Real-time Live Bridge & REST Endpoints
  // ---------------------------------------------------------

  app.post("/api/swine-ai-analyze", requireFirebaseAuth, async (req, res) => {
    const { image, sowId, sowTag, mode, prompt, textQuery } = req.body;
    try {
      const apiKey = process.env.CENTRAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("API key missing");
      }

      const ai = createAiClient();

      const contents: any[] = [];
      const systemInstruction = `คุณคือ "หมอหมู AI" (Nipon Farm Swine Breeding Specialist) ผู้เชี่ยวชาญด้านการประเมินสัดและการสแกนตรวจท้องของแม่สุกร ให้คำวินิจฉัยสัตวแพทย์ที่ละเอียด ละมุนละไม เป็นมิตรแบบไทย และแม่นยำ`;

      if (image) {
        contents.push({
          parts: [
            {
              inlineData: {
                data: image.split(',')[1] || image,
                mimeType: "image/jpeg"
              }
            },
            {
              text: prompt || "วิเคราะห์สภาพร่างกายของแม่พันธุ์หมูตัวนี้ โดยละเอียด"
            }
          ]
        });
      } else if (textQuery) {
        contents.push({
          parts: [{ text: textQuery }]
        });
      } else {
        return res.status(400).json({ error: "No image or textQuery provided" });
      }

      const response = await ai.models.generateContent({
        model: aiModels.vision,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { 
                type: Type.STRING, 
                description: "ข้อความสรุปวิเคราะห์โรค พฤติกรรม หรือสรีรวิทยาของแม่หมู อธิบายละเอียดอ่อน สุภาพ ลงท้ายด้วยครับ/ค่ะ" 
              },
              vulvaSwelling: { 
                type: Type.INTEGER, 
                description: "ระดับดัชนีบวมแดงอวัยวะเพศ (0-100)" 
              },
              pregnancyConfidence: { 
                type: Type.INTEGER, 
                description: "ดัชนีตรวจครรภ์สำเร็จ (0-100)" 
              },
              standingReflex: { 
                type: Type.STRING, 
                description: "ผล Standing reflex: 'NONE' หรือ 'WEAK' หรือ 'STRONG'" 
              },
              diagnosticResult: { 
                type: Type.STRING, 
                description: "ข้อวินิจฉัยสรุป: 'ESTRUS_ACTIVE' หรือ 'ESTRUS_NONE' หรือ 'PREGNANT' หรือ 'NOT_PREGNANT'" 
              }
            },
            required: ["text", "vulvaSwelling", "pregnancyConfidence", "standingReflex", "diagnosticResult"]
          }
        }
      });

      const resultText = response.text || "{}";
      const parsed = JSON.parse(resultText);

      res.json({
        success: true,
        text: parsed.text,
        metrics: {
          vulvaSwelling: parsed.vulvaSwelling ?? 50,
          pregnancyConfidence: parsed.pregnancyConfidence ?? 50,
          standingReflex: parsed.standingReflex ?? "NONE"
        },
        diagnosticResult: parsed.diagnosticResult ?? "UNCERTAIN"
      });

    } catch (err: any) {
      console.error("Swine AI Analyze Error:", err);
      const isMissingKey = String(err?.message || err).includes("API key missing");
      res.status(isMissingKey ? 503 : 500).json({
        success: false,
        error: isMissingKey
          ? "ระบบ AI ยังไม่ได้ตั้งค่า API key"
          : "ระบบ AI ไม่สามารถวิเคราะห์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
      });
    }
  });

  app.post("/api/upload-gateway", async (req, res) => {
    try {
      const { image, path: destinationPath } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Missing image data" });
      }

      const fileName = destinationPath ? destinationPath.split("/").pop() : `img_${Date.now()}.webp`;

      // 1. Try ImageKit Gateway
      const imageKitPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
      const imageKitUrlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
      
      if (imageKitPrivateKey && imageKitUrlEndpoint) {
        console.log(`[Central Image Gateway] Uploading to ImageKit: ${fileName}`);
        
        // Build Basic auth header
        const authHeader = "Basic " + Buffer.from(imageKitPrivateKey + ":").toString("base64");
        
        const form = new URLSearchParams();
        form.append("file", image);
        form.append("fileName", fileName || "upload.webp");
        form.append("useUniqueFileName", "true");
        
        const ikResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: form.toString()
        });

        if (ikResponse.ok) {
          const ikData = await ikResponse.json();
          if (ikData && ikData.url) {
            console.log("[Central Image Gateway] ImageKit upload successful:", ikData.url);
            return res.json({ success: true, url: ikData.url });
          }
        } else {
          const errText = await ikResponse.text();
          console.warn("[Central Image Gateway] ImageKit API responded with error:", errText);
        }
      }

      // If neither is configured, or they both fail, let the client know to fall back
      console.log("[Central Image Gateway] No active third-party cloud gateway credentials configured. Delegating to direct Firebase Storage client-side upload.");
      return res.json({ success: false, reason: "gateway_not_configured" });

    } catch (err: any) {
      console.error("[Central Image Gateway] Error processing upload gateway request:", err);
      return res.status(500).json({ error: "Gateway upload failed", details: err.message });
    }
  });

  app.get("/api/proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      if (imageUrl.startsWith("data:") || imageUrl.startsWith("/")) {
        return res.status(400).json({ error: "Cannot proxy local or data URLs" });
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: `Image server returned error status ${response.status}` });
      }

      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.send(Buffer.from(buffer));
    } catch (error: any) {
      console.error("Proxy Image Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Catch-all for other API routes to prevent them falling through to SPA fallback
  app.all("/api/*", (req, res) => {
    console.warn(`404: API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.url}` });
  });

  // Express Error Handler for JSON parsing and payload limits
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error("Express Error:", err);
      res.status(err.status || 500).json({ error: "Server Error", details: err.message });
    } else {
      next();
    }
  });

  if (serveFrontend && process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (serveFrontend) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

export async function startStandaloneServer() {
  const http = await import("node:http");
  const { WebSocketServer } = await import("ws");
  const { initDailyTasksCron } = await import("./server/dailyTasksAlert");
  const app = await createApp();
  const PORT = Number(process.env.PORT || 3000);
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    console.log("[WS Connection] Client connected to Live AI scan");
    let authenticated = false;
    let sowTag = "Unknown";
    let streamMode = "ESTRUS";

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === "start") {
          const projectId = process.env.VITE_FIREBASE_PROJECT_ID?.trim();
          if (!projectId || typeof msg.idToken !== "string") {
            ws.close(1008, "Authentication required");
            return;
          }

          try {
            await verifyFirebaseIdToken(msg.idToken, projectId);
            authenticated = true;
          } catch (error) {
            console.warn("[WS Auth] Token verification failed:", (error as Error).message);
            ws.close(1008, "Invalid authentication token");
            return;
          }

          sowTag = msg.sowTag || "Unknown";
          streamMode = msg.mode || "ESTRUS";
          ws.send(JSON.stringify({ 
            type: "status", 
            message: `📡 [หมอหมู AI] เชื่อมต่อสัญญาณตรวจแม่หมูเบอร์ ${sowTag} สำเร็จ พร้อมวิเคราะห์กล้องและเสียงสตรีมสดแล้วครับ` 
          }));
        } 
        else if (msg.type === "text_query") {
          if (!authenticated) {
            ws.close(1008, "Authentication required");
            return;
          }

          const text = msg.text;
          const apiKey = process.env.CENTRAL_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
          
          if (!apiKey) {
            ws.send(JSON.stringify({ 
              type: "transcript", 
              source: "ai", 
              text: "ระบบ AI ยังไม่ได้ตั้งค่า API key จึงยังไม่สามารถวิเคราะห์ได้ครับ"
            }));
            return;
          }

          const ai = createAiClient();
          try {
            const systemInstruction = `คุณคือ "หมอหมู AI" (Nipon Farm Swine Specialist) ผู้เชี่ยวชาญวิเคราะห์สรีระพฤติกรรมสุกร ตอบสั้นกระชับ สุภาพ ทันใจ ลงท้ายด้วยครับ`;
            const response = await ai.models.generateContent({
              model: aiModels.text,
              contents: [{ parts: [{ text: `ผู้เลี้ยงถามว่า: "${text}" เกี่ยวกับแม่หมูเบอร์ ${sowTag} ในการตรวจ ${streamMode}` }] }],
              config: { systemInstruction }
            });
            ws.send(JSON.stringify({ 
              type: "transcript", 
              source: "ai", 
              text: response.text || "รับทราบข้อมูลครับ" 
            }));
          } catch (e: any) {
            console.error("[WS AI Error]", e);
            ws.send(JSON.stringify({ type: "transcript", source: "ai", text: "ระบบ AI วิเคราะห์ไม่สำเร็จ กรุณาลองใหม่อีกครั้งครับ" }));
          }
        }
      } catch (err) {
        console.error("[WS Message Error]", err);
      }
    });

    ws.on("close", () => {
      console.log("[WS Connection] Client disconnected");
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const url = request.url || "";
    if (url.startsWith("/live")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Register the automated morning task email dispatcher at 05:00 AM Bangkok Time
    initDailyTasksCron();
  });
}
