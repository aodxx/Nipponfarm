# Gemini API Error and Fallback Audit

วันที่ตรวจ: **4 กันยายน 2026**
ขอบเขต: `aiReady`, Gemini provider, Receipt AI, Swine AI, Text-to-Speech และ Live AI WebSocket

## Executive conclusion

ระบบตรวจ `aiReady` ใน `/api/health` ด้วยการตรวจว่ามี `GEMINI_API_KEY` หรือ legacy `CENTRAL_GEMINI_API_KEY` หรือไม่. เมื่อ `aiReady` เป็น `false`, endpoint ส่วนใหญ่ **ไม่เรียก Gemini** และคืน error แทน แต่มีพฤติกรรมต่างกันตาม endpoint. Receipt AI มี retry และ model fallback เฉพาะกรณีที่มี API key แล้วการเรียก model ล้มเหลว. Swine AI REST และ TTS ไม่มี model fallback. Live AI WebSocket ส่งข้อความแจ้งว่า API key ยังไม่ถูกตั้งค่า. ฝั่ง Receipt UI มีทางเลือกกรอกข้อมูลด้วยมือ แต่ Swine AI และ TTS ไม่มี fallback ที่ทำให้ฟังก์ชันหลักทำงานต่อได้อย่างสมบูรณ์.

ผลรวมจึงเป็น **Fail-safe ด้านการไม่เรียก API เมื่อไม่มี key: มี**, **Fallback ที่รักษาความต่อเนื่องของงาน: บางส่วน**, และ **Error contract ที่สม่ำเสมอทุก endpoint: ยังไม่มี**.

## Readiness implementation

`server/aiProvider.ts` ใช้ `GEMINI_API_KEY` ก่อน `CENTRAL_GEMINI_API_KEY` และใช้ค่า default ของ model เมื่อไม่ได้ตั้ง model-specific variables. `createAiClient()` จะ throw `GEMINI_API_KEY is not configured` หากไม่มี key. อย่างไรก็ตาม `isAiConfigured()` และ `/api/health` ตรวจเฉพาะการมีค่า key ไม่ได้ตรวจว่า key ใช้งานได้จริง, model ถูกต้อง, quota เหลือ หรือ provider ตอบกลับได้.

`api/health.ts` คืน HTTP 200 และ `status: "ok"` แม้ `aiReady:false`. จึงหมายความว่า process ยัง healthy แต่ AI integration ยังไม่พร้อม. Monitoring ที่ตรวจเฉพาะ HTTP 200 อาจไม่พบปัญหา AI.

## Endpoint behavior when `aiReady` is false

| Endpoint | Server behavior | Client behavior | Fallback quality |
| --- | --- | --- | --- |
| `POST /api/receipt-analyze` | ตรวจ key ก่อนสร้าง client; ไม่มี key คืน HTTP 500 พร้อมข้อความภาษาไทย | `aiService` อ่าน `error` แล้วส่งต่อ; `ScanReceipt` แสดง error และมีปุ่ม/flow กรอกข้อมูลมือ | **Partial**: manual entry ใช้งานต่อได้ แต่ไม่ใช่ automatic fallback |
| `POST /api/swine-ai-analyze` | ไม่มี key แล้ว throw `API key missing`; catch คืน HTTP 500 ข้อความทั่วไป | ภาพแสดง error; text query มี catch และเพิ่มข้อความแจ้งขัดข้อง | **Weak**: ไม่มี manual diagnostic fallback หรือ local speech fallback |
| `POST /api/text-to-speech` | ไม่มี key คืน HTTP 500 `Gemini API key is not configured`; exception อื่นคืน HTTP 500 | `ScanAI` catch แล้วหยุดสถานะ speaking แต่ไม่ใช้ Web Speech fallback | **Missing**: ชื่อฟังก์ชันเป็น fallback แต่ยังไม่ fallback ไป browser speech |
| Live AI WebSocket `text_query` | หลัง auth แล้ว หากไม่มี key ส่ง transcript ภาษาไทยแจ้งว่า AI ยังไม่ได้ตั้งค่า และไม่ปิด socket | UI รับ transcript ได้ตาม flow WebSocket | **Graceful degradation**: แจ้งผู้ใช้และคง connection ไว้ แต่ไม่มี local analysis |

## Receipt AI: retry and model fallback

Receipt AI สร้าง candidate model list จาก configured vision model และเพิ่ม `gemini-2.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.5-flash` และ `gemini-flash-latest` โดยกำจัดชื่อซ้ำ. แต่ละ model retry ได้สองครั้ง และหน่วงเวลาหนึ่งวินาทีระหว่าง retry. ระบบใช้ model ถัดไปเมื่อ model ก่อนหน้าไม่มี response หรือเกิด exception.

กลไกนี้ช่วยกรณี model unavailable, transient failure หรือ response ว่าง แต่ **ไม่ทำงานเมื่อไม่มี API key** เพราะ route หยุดก่อนเริ่ม loop. นอกจากนี้ invalid key และ quota error อาจทำให้ระบบลองหลาย model โดยไม่จำเป็น เพราะไม่มีการแยก permanent error ออกจาก transient error. หลังลองครบแล้วระบบคืน HTTP 500 และจัดข้อความสำหรับ quota, invalid key และ service unavailable.

เมื่อ Gemini คืน text ที่ไม่ใช่ JSON ระบบคืน HTTP 500 พร้อมข้อความว่า response format ไม่ถูกต้อง. Fallback สุดท้ายในฝั่ง UI คือ manual entry ซึ่งผู้ใช้ต้องเลือกเอง. ระบบไม่ได้สร้างผลวิเคราะห์ปลอมหรือบันทึกผล AI เมื่อ provider ไม่พร้อม.

## Swine AI REST

Swine AI REST ตรวจ API key แล้วสร้าง Gemini client จากนั้นเรียก model ที่กำหนดใน `aiModels.vision` เพียง model เดียว. เมื่อไม่มี key จะเข้าสู่ catch และคืน HTTP 500 ข้อความทั่วไปว่า AI วิเคราะห์ไม่ได้. เมื่อ provider ล้มเหลวก็ไม่มี retry, model fallback, timeout policy หรือ structured error code.

ฝั่งภาพตรวจ HTTP response แบบอ้อมผ่าน `data.success`; หาก request throw จะแสดง error. ฝั่ง text queryมี `.catch()` และหยุด loading ได้ถูกต้อง. ไม่มีโหมด manual ที่คำนวณหรือบันทึก diagnostic แบบไม่ใช้ AI.

## Text-to-Speech

TTS ตรวจ text และ API key ก่อนเรียก Gemini. เมื่อไม่มี key คืน HTTP 500. เมื่อ Gemini ไม่คืน audio data ก็คืน HTTP 500. Client จับ exception และ reset `aiIsSpeaking` แต่ไม่ได้เรียก `window.speechSynthesis` แม้ `src/services/aiService.ts` จะมี helper `speakText()` สำหรับ Web Speech API อยู่แล้ว.

จุดนี้จึงเป็น fallback gap ที่ชัดเจน: ควรเลือกอย่างใดอย่างหนึ่งระหว่างซ่อนปุ่ม TTS เมื่อ `aiReady:false` หรือ fallback ไป Web Speech API พร้อมแจ้งว่าเป็นเสียง browser ไม่ใช่ Gemini TTS.

## Live AI WebSocket

Standalone WebSocket ตรวจ Firebase token ก่อนประมวลผล. เมื่อไม่มี Gemini key จะส่ง transcript ที่อธิบายสถานะและไม่เรียก `generateContent`. เมื่อ Gemini call ล้มเหลวหลังมี key จะส่ง transcript ทั่วไปว่าไม่สามารถวิเคราะห์ได้. WebSocket path นี้ยังไม่ถูก export ผ่าน `api/index.ts` ตาม project status จึงไม่ควรถือว่าเป็น Vercel Production fallback.

## Error-handling risks

### Error contract ไม่สม่ำเสมอ

Receipt, Swine AI และ TTS ใช้ HTTP 500 สำหรับ configuration missing ขณะที่ unauthenticated request ใช้ HTTP 401. Client จึงต้องตีความข้อความแทน error code ที่แน่นอน. ควรมีรหัสเช่น `AI_NOT_CONFIGURED`, `AI_QUOTA_EXCEEDED`, `AI_PROVIDER_UNAVAILABLE` และ `AI_INVALID_RESPONSE`.

### Health status อาจ optimistic เกินไป

`/api/health` คืน 200 และ `status: ok` เมื่อไม่มี key. ควรให้ monitoring อ่าน `aiReady` แยกเป็น dependency status หรือคืน `status: degraded` เมื่อ AI จำเป็นต่อ release นั้น. ไม่ควรทำให้ Kubernetes/Vercel process health ล้มเหลวเพียงเพราะ optional integration ยังไม่ตั้งค่า.

### Response อาจเปิดเผยรายละเอียดภายใน

Receipt route คืน `details: errorStr` ใน HTTP response. Error string จาก SDK อาจมีรายละเอียด provider, request metadata หรือข้อมูลที่ไม่ควรเปิดให้ browser. Production response ควรส่งเฉพาะ safe error code/message และเก็บรายละเอียดไว้ใน server logs ที่ redact แล้ว.

### Retry อาจเพิ่ม latency และ quota waste

Receipt loop อาจยิงได้สูงสุด 10 calls ต่อ request. Permanent errors เช่น invalid key ไม่ควร retry ทุก candidate model. ควร classify status ก่อน retry และกำหนด timeout รวมของ request.

### `aiReady` ไม่ได้ถูกใช้เป็น shared gate

Routes ตรวจ environment key แยกกันแทนที่จะใช้ readiness helper เดียว. Behavior จึงแตกต่างกันและ legacy key fallback ถูกใช้ซ้ำหลายจุด. ควรสร้าง helper กลางที่คืน `{ configured, reason }` โดยไม่ส่ง secret ออก response.

## Recommended implementation order

| Priority | Change | Expected result |
| --- | --- | --- |
| P0 | ใช้ safe error codes และลบ `details: errorStr` จาก production response | ลดข้อมูลภายในรั่วและทำให้ client handle ได้แน่นอน |
| P0 | เพิ่ม shared `requireAiConfigured`/readiness result ในทุก Gemini REST route | เมื่อ `aiReady:false` ทุก route ตอบรูปแบบเดียวกัน |
| P1 | เพิ่ม Web Speech API fallback ใน TTS client หรือ disable TTS action เมื่อ AI ไม่พร้อม | ผู้ใช้ยังอ่านข้อความเสียงได้โดยไม่ต้องใช้ Gemini |
| P1 | แยก permanent errors จาก transient errors ใน Receipt retry | ลด latency และ quota waste |
| P1 | เพิ่ม timeout และ retry budget ต่อ request | ป้องกัน function timeout บน Vercel |
| P2 | เพิ่ม integration health probe แบบ authenticated/admin-only ที่ทดสอบ provider อย่างจำกัด | ตรวจ key validity/quota ได้จริงโดยไม่เปิดเผย secret |
| P2 | ตัด `CENTRAL_GEMINI_API_KEY` fallback หลัง migration ยืนยันแล้ว | ลด configuration ambiguity |

## Verification performed

- อ่าน `server/aiProvider.ts`, `api/health.ts`, `appServer.ts`, `src/services/aiService.ts`, `src/pages/ScanReceipt.tsx` และ `src/pages/ScanAI.tsx`.
- ค้นหา Gemini key access, readiness checks, retries, fallback และ error handling ทั้ง repository.
- ยืนยัน production `/api/health` ตอบ HTTP 200 และรายงาน `aiReady:false`.
- ไม่เรียก Gemini API จริงและไม่แก้ source code ในรอบ audit นี้.

## References

[1]: https://github.com/aodxx/Nipponfarm/blob/main/server/aiProvider.ts "Niponfarm AI provider implementation"

[2]: https://github.com/aodxx/Nipponfarm/blob/main/api/health.ts "Niponfarm health endpoint"

[3]: https://github.com/aodxx/Nipponfarm/blob/main/appServer.ts "Niponfarm application server routes"

[4]: https://github.com/aodxx/Nipponfarm/blob/main/src/services/aiService.ts "Niponfarm AI client service"

[5]: https://github.com/aodxx/Nipponfarm/blob/main/src/pages/ScanAI.tsx "Niponfarm Swine AI client page"
