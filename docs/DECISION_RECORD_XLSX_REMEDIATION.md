# Decision Record: XLSX Remediation

วันที่ตัดสินใจ: **17 กันยายน 2026**
สถานะ: **Accepted — temporary containment; replacement or safe upgrade remains open**
ขอบเขต: Payroll Summary Excel export ใน `src/pages/payroll/PayrollSummary.tsx`

## Context

`xlsx@0.18.5` เป็น direct runtime dependency และ `npm audit` รายงาน High advisories เกี่ยวกับ Prototype Pollution และ Regular Expression Denial of Service. Advisories ครอบคลุมเวอร์ชันต่ำกว่า `0.19.3` และ `0.20.2`. ณ วันที่ตรวจ npm ไม่รายงาน safe automatic fix.

การใช้งานจริงใน repository พบที่ Payroll Summary export เท่านั้น. ระบบสร้าง workbook ฝั่ง browser จาก array-of-arrays ด้วย `aoa_to_sheet`, สร้าง worksheet ใหม่ และเรียก `writeFile` เพื่อดาวน์โหลดไฟล์. ไม่พบ server-side workbook parsing, ไม่รับไฟล์ XLSX จากผู้ใช้ และไม่มีการเขียนไฟล์ลง server.

อย่างไรก็ตาม workbook มีข้อมูลเงินเดือน, รายได้, เงินเบิกล่วงหน้า, ยอดสุทธิ, ธนาคาร และเลขบัญชี. การเปลี่ยน library หรือ output behavior โดยไม่มี regression coverage อาจกระทบ workflow ทางการเงินและเอกสารที่ผู้ใช้ดาวน์โหลด.

## Decision

PR Batch 1 จะ **ไม่อัปเกรด, ลบ หรือแทนที่ `xlsx`**. จะคง dependency เดิมไว้ชั่วคราวและเปิด remediation เป็นงานแยกที่มี test และ compatibility evidence เฉพาะทาง.

เหตุผลคือ:

1. npm ไม่มี safe automatic fix สำหรับ direct advisory นี้.
2. การอัปเกรดแบบ force อาจเป็น major jump และอาจเปลี่ยน workbook output หรือ API behavior.
3. การลบ dependency ทันทีจะทำให้ Payroll Summary export หยุดทำงาน.
4. Exposure ปัจจุบันจำกัดอยู่ที่ client-side generation จากข้อมูลที่ระบบสร้างเอง; server ไม่ parse workbook จากผู้ใช้.
5. ข้อมูล payroll เป็นข้อมูลอ่อนไหว จึงต้องมี regression และ privacy review ก่อนเปลี่ยน implementation.

การตัดสินใจนี้ **ไม่ใช่การยอมรับความเสี่ยงถาวร** และไม่ถือว่า vulnerability ถูกแก้แล้ว.

## Interim controls

ระหว่างที่ยังคง `xlsx@0.18.5`:

- ไม่เปิด endpoint ให้ upload หรือ parse workbook จากผู้ใช้ด้วย package นี้.
- คงการสร้าง workbook จากข้อมูล payroll ที่ผ่าน application flow เท่านั้น.
- คง authorization ของ Payroll Summary และไม่เปลี่ยน Firestore/Storage rules ใน PR Batch 1.
- จำกัด scope ของ future change ให้เฉพาะ export path และหลีกเลี่ยงการเพิ่ม parser features.
- ติดตาม npm advisory และ package release ที่มี fix อย่างเป็นทางการ.
- บันทึก package นี้เป็น unresolved ใน `KNOWN_ISSUES.md` จนกว่าจะมี replacement, safe patched release หรือ approved compensating-control review.

## Options considered

| Option | Decision | Reason |
| --- | --- | --- |
| `npm audit fix --force` | Reject | อาจทำ major upgrade โดยไม่มี compatibility evidence และขัดกับ `NEXT_ACTIONS.md` |
| อัปเกรดเป็น version ที่สูงกว่าแบบทันที | Defer | npm audit ไม่ให้ safe automatic fix; ต้องยืนยัน API/output และ browser compatibility ก่อน |
| ลบ `xlsx` ตอนนี้ | Reject | ทำลาย Payroll Summary export ที่ผู้ใช้ใช้งานอยู่ |
| เปลี่ยน library ใน PR Batch 1 | Defer | เปลี่ยน scope และ risk ของ PR; ต้องมี independent export fixtures และ visual/file compatibility tests |
| คง `xlsx` พร้อม containment | **Accept temporarily** | เป็นทางเลือกที่ reversible และไม่ทำลาย workflow ระหว่างรอ evidence |

## Exit criteria

`xlsx` remediation จะถือว่าพร้อมทำใน PR แยกเมื่อมีครบ:

1. ตัวเลือก library หรือ target version ที่ระบุชัด.
2. Fixture payroll ที่ไม่ใช้ข้อมูลจริง.
3. Test ยืนยัน sheet name, headers, totals, column widths, merged title cells และ output filename.
4. Test เปิดไฟล์ที่สร้างได้ด้วย reader ที่เชื่อถือได้โดยไม่ใช้ข้อมูล production.
5. Browser download smoke test.
6. `npm audit` evidence หลังเปลี่ยน.
7. `npm run test:auth`, `npm run lint`, `npm run build` และ standalone smoke ผ่าน.
8. Review ว่าไม่มี salary, bank account หรือ PII ถูกส่งไป external service ระหว่าง export.

## Consequence

Batch 1 จะลด direct Nodemailer vulnerability ด้วย patch ภายใน major เดิม แต่ vulnerability ของ `xlsx` ยังคงอยู่และถูกติดตามเป็น P1. Production status ยังไม่ควรประกาศ dependency-clean จนกว่าจะมีหลักฐานตาม exit criteria.

## References

[1]: https://github.com/advisories/GHSA-4r6h-8v6p-xvw6 "Prototype Pollution in SheetJS xlsx"

[2]: https://github.com/advisories/GHSA-5pgg-2g8v-p4x9 "SheetJS Regular Expression Denial of Service"

[3]: https://docs.npmjs.com/cli/v10/commands/npm-audit "npm audit command documentation"
