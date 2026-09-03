import React, { useState, useRef, useEffect } from "react";
import { Camera, StopCircle, Upload, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Film, Trash2, Video } from "lucide-react";
import { authenticatedFetch } from "../lib/authenticatedFetch";

interface VideoRecorderUploadProps {
  userId: string;
  moduleName: "events" | "maintenance";
  onCreateDraft: () => Promise<string>;
  onUploadSuccess: (videoUrl: string, docId: string) => Promise<void>;
  onUploadFailure: (docId: string) => Promise<void>;
  onCancel?: () => void;
  maxSizeMB?: number;
}

export const VideoRecorderUpload: React.FC<VideoRecorderUploadProps> = ({
  userId,
  moduleName,
  onCreateDraft,
  onUploadSuccess,
  onUploadFailure,
  onCancel,
  maxSizeMB = 20
}) => {
  const [mode, setMode] = useState<"select" | "record" | "upload_file">("select");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Status states
  const [status, setStatus] = useState<"idle" | "drafting" | "presigning" | "uploading" | "finalizing" | "success" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [estimatedSizeMB, setEstimatedSizeMB] = useState(0);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  // Video refs
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Clean up streams on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  // Start Camera Stream for Recording
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 }
        },
        audio: true
      });
      streamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true; // Mute preview to prevent loop feedback
        videoPreviewRef.current.play();
      }
      setMode("record");
      setRecordedBlob(null);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setErrorMessage("ไม่สามารถเข้าถึงกล้องหรือไมโครโฟนได้ กรุณาอนุมัติสิทธิ์การเข้าใช้งานอุปกรณ์");
    }
  };

  // Determine standard supported MediaRecorder formats
  const getSupportedMimeType = () => {
    const types = [
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm",
      "video/mp4"
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "";
  };

  // Start Recording
  const startRecording = () => {
    if (!streamRef.current) return;
    
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    
    // Configure optimized bits per second to save bandwidth and fit under 20MB
    // 1,000,000 bps (1 Mbps) is perfect for clear 480p farm videos
    const recorderOptions: any = {
      mimeType,
      videoBitsPerSecond: 1000000 
    };

    try {
      const recorder = new MediaRecorder(streamRef.current, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunksRef.current, { type: mimeType || "video/webm" });
        
        // Size validation
        if (videoBlob.size > maxSizeBytes) {
          setErrorMessage(`ความยาววิดีโอเกินขนาดที่กำหนด! ขนาดวิดีโอคือ ${(videoBlob.size / (1024 * 1024)).toFixed(1)}MB (จำกัดไม่เกิน ${maxSizeMB}MB) กรุณาอัดคลิปให้สั้นลง`);
          setRecordedBlob(null);
        } else {
          setRecordedBlob(videoBlob);
          setEstimatedSizeMB(videoBlob.size / (1024 * 1024));
        }
      };

      recorder.start(1000); // chunk every 1 second
      setIsRecording(true);
      setRecordingSeconds(0);
      setErrorMessage(null);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => {
          // Limit recording duration if size is close to 20MB
          // At 1.2 Mbps, 2 minutes is ~18MB, so limit to 120 seconds to prevent file bloat
          if (prev >= 120) {
            stopRecording();
            setErrorMessage("หยุดบันทึกอัตโนมัติเนื่องจากเวลาในการบันทึกครบ 2 นาทีเพื่อไม่ให้ไฟล์เกิน 20MB");
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error("MediaRecorder start error:", err);
      setErrorMessage("ไม่สามารถเริ่มบันทึกวิดีโอได้: " + err.message);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      stopCameraStream();
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeBytes) {
      setErrorMessage(`ไม่สามารถเลือกไฟล์นี้ได้! ขนาดไฟล์ ${(file.size / (1024 * 1024)).toFixed(1)}MB เกินที่กำหนด (จำกัดไม่เกิน ${maxSizeMB}MB)`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setEstimatedSizeMB(file.size / (1024 * 1024));
    setErrorMessage(null);
  };

  // Reset Component
  const handleReset = () => {
    stopCameraStream();
    if (timerRef.current) clearInterval(timerRef.current);
    setMode("select");
    setIsRecording(false);
    setRecordedBlob(null);
    setSelectedFile(null);
    setStatus("idle");
    setUploadProgress(0);
    setErrorMessage(null);
    setCurrentDocId(null);
  };

  // Core Draft System + R2 upload function
  const handleStartUploadProcess = async () => {
    const fileToUpload = selectedFile || recordedBlob;
    if (!fileToUpload) {
      setErrorMessage("กรุณาเลือกไฟล์หรือบันทึกวิดีโอก่อนอัปโหลด");
      return;
    }

    setErrorMessage(null);
    let draftId = "";

    try {
      // Step 1: Create Draft on Firestore to lock a unique Document ID
      setStatus("drafting");
      draftId = await onCreateDraft();
      setCurrentDocId(draftId);

      // Step 2: Request PUT Presigned URL from backend
      setStatus("presigning");
      const ext = selectedFile ? selectedFile.name.split(".").pop() : "webm";
      const contentType = selectedFile ? selectedFile.type : (recordedBlob?.type || "video/webm");
      const r2Key = `videos/${moduleName}/${draftId}.${ext}`;

      const presignResponse = await authenticatedFetch("/api/r2/presign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          contentType,
          key: r2Key
        })
      });

      const presignData = await presignResponse.json();
      if (!presignResponse.ok || !presignData.success) {
        throw new Error(presignData.error || "ขอสิทธิ์อัปโหลดกับ Cloudflare R2 ล้มเหลว");
      }

      const { uploadUrl } = presignData;

      // Step 3: Perform direct PUT upload with XML/XHR upload monitoring
      setStatus("uploading");
      setUploadProgress(10);

      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", contentType);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round((event.loaded / event.total) * 90); // 10% to 100%
          setUploadProgress(percentage);
        }
      };

      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Cloudflare R2 อัปโหลดล้มเหลว (HTTP ${xhr.status})`));
          }
        };
        xhr.onerror = () => reject(new Error("เครือข่ายขัดข้องระหว่างอัปโหลดไปยัง R2"));
        xhr.onabort = () => reject(new Error("การอัปโหลดถูกยกเลิก"));
      });

      xhr.send(fileToUpload);
      await uploadPromise;

      // Step 4: Finalize the Draft Document on Firestore
      setStatus("finalizing");
      setUploadProgress(100);

      // Construct final accessible URL using custom S3 API endpoint mapping
      // Or we can save the object key directly so that SecureVideoPlayer can dynamically sign it on GET!
      // Storing the R2 relative key/URL is the absolute safest way to enforce secure streaming!
      const publicVideoUrl = r2Key;

      await onUploadSuccess(publicVideoUrl, draftId);
      setStatus("success");

    } catch (err: any) {
      console.error("Upload process error:", err);
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการอัปโหลดไฟล์");
      setStatus("error");

      // CLEANUP FIRESTORE DRAFT IF FAILED (Prevents garbage collection build-up)
      if (draftId) {
        try {
          await onUploadFailure(draftId);
          console.log("[Draft Cleanup] Cleaned up orphaned Firestore draft:", draftId);
        } catch (cleanupErr) {
          console.error("Failed to clean up draft document after upload failure:", cleanupErr);
        }
      }
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-xl mx-auto text-slate-100">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center space-x-2">
          <Film className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            อัปโหลดวิดีโองานฟาร์ม (จำกัด {maxSizeMB}MB)
          </h3>
        </div>
        {onCancel && status === "idle" && (
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium px-2 py-1"
          >
            ยกเลิก
          </button>
        )}
      </div>

      {/* ERROR MESSAGE DISPLAY */}
      {errorMessage && (
        <div className="flex items-start space-x-2 bg-rose-950/40 border border-rose-900/50 p-4 rounded-xl mb-5 text-rose-200">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold">เกิดความผิดพลาด</p>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* MODES: SELECT / RECORD / UPLOAD_FILE */}
      {status === "idle" && (
        <div>
          {mode === "select" && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-6 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl transition cursor-pointer group"
              >
                <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl group-hover:scale-105 transition duration-250 mb-3">
                  <Video className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold">อัดวิดีโอสดผ่านกล้อง</span>
                <span className="text-[10px] text-slate-500 mt-1">480p บีบอัดในตัว</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("upload_file")}
                className="flex flex-col items-center justify-center p-6 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl transition cursor-pointer group"
              >
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl group-hover:scale-105 transition duration-250 mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <span className="text-xs font-semibold">เลือกไฟล์วิดีโอจากเครื่อง</span>
                <span className="text-[10px] text-slate-500 mt-1">MP4, WebM (ไม่เกิน {maxSizeMB}MB)</span>
              </button>
            </div>
          )}

          {/* LIVE RECORDING SCREEN */}
          {mode === "record" && (
            <div className="space-y-4">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden border border-slate-800">
                <video
                  ref={videoPreviewRef}
                  className="w-full h-full object-cover transform -scale-x-100"
                  playsInline
                  muted
                />
                
                {/* Recording indicator & timer */}
                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center space-x-1.5 bg-rose-600 px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white block" />
                    <span>REC {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center space-x-3">
                {!isRecording && !recordedBlob ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-white block animate-ping" />
                    <span>เริ่มบันทึกภาพ</span>
                  </button>
                ) : isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-slate-100 hover:bg-white active:bg-slate-200 text-slate-900 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <StopCircle className="h-4 w-4 text-rose-600" />
                    <span>หยุดบันทึกภาพ</span>
                  </button>
                ) : null}

                {recordedBlob && (
                  <div className="text-center space-y-3 w-full">
                    <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 text-xs">
                      <p className="font-semibold text-emerald-400">บันทึกวิดีโอสำเร็จ!</p>
                      <p className="text-slate-400 mt-0.5 font-mono">ขนาดไฟล์ประมาณ {estimatedSizeMB.toFixed(2)} MB</p>
                    </div>

                    <div className="flex justify-center space-x-3">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>อัดใหม่</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleStartUploadProcess}
                        className="flex items-center space-x-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>อัปโหลดคลิปลง R2</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!isRecording && !recordedBlob && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    ย้อนกลับ
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FILE UPLOAD SCREEN */}
          {mode === "upload_file" && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center aspect-[21/9] bg-slate-850 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl cursor-pointer p-6 transition group text-center">
                <Upload className="h-8 w-8 text-slate-500 group-hover:text-indigo-400 mb-2 transition" />
                <span className="text-xs font-semibold text-slate-300">กดเพื่อเลือกคลิปจากโทรศัพท์หรือแท็บเล็ต</span>
                <span className="text-[10px] text-slate-500 mt-1">ไฟล์วิดีโอ MP4, WebM หรือ QuickTime จำกัดไม่เกิน {maxSizeMB}MB</span>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-left">
                    <Film className="h-8 w-8 text-indigo-400 shrink-0" />
                    <div className="text-xs overflow-hidden">
                      <p className="font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                      <p className="text-slate-400 mt-0.5 font-mono">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-slate-200 font-medium"
                >
                  ย้อนกลับ
                </button>
                
                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleStartUploadProcess}
                    className="flex items-center space-x-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>อัปโหลดวิดีโอ</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LOADING STATES */}
      {status !== "idle" && status !== "success" && status !== "error" && (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          
          <div className="text-xs space-y-1">
            {status === "drafting" && <p className="font-semibold text-slate-300">กำลังจองเอกสารฉบับร่างบน Firestore...</p>}
            {status === "presigning" && <p className="font-semibold text-slate-300">กำลังขอ Presigned URL ขาเข้า Cloudflare R2...</p>}
            {status === "uploading" && (
              <div className="space-y-2">
                <p className="font-semibold text-slate-300">กำลังส่งสัญญาณภาพขึ้น Cloudflare R2...</p>
                <p className="text-[10px] text-slate-500 font-mono">ขนาดคลิป: {estimatedSizeMB.toFixed(2)} MB</p>
                
                {/* PROGRESS BAR */}
                <div className="w-48 bg-slate-800 rounded-full h-1.5 mx-auto overflow-hidden">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-indigo-400 font-bold">{uploadProgress}% อัปโหลดเสร็จสิ้น</p>
              </div>
            )}
            {status === "finalizing" && <p className="font-semibold text-slate-300">อัปโหลดภาพสำเร็จ! กำลังอัปเดตบันทึกข้อมูลหลัก...</p>}
          </div>
        </div>
      )}

      {/* SUCCESS SCREEN */}
      {status === "success" && (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full scale-110">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-emerald-400">อัปโหลดและจัดเก็บสำเร็จเสร็จสิ้น!</p>
            <p className="text-slate-400">วิดีโอของคุณได้จัดเก็บลงระบบสำรอง R2 เรียบร้อยแล้ว</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-800 px-4 py-1.5 rounded-lg hover:bg-slate-850 transition"
          >
            อัปโหลดวิดีโอเพิ่มเติม
          </button>
        </div>
      )}

      {/* ERROR / RETRY SCREEN */}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div className="text-xs space-y-1">
            <p className="font-semibold text-rose-400">ระบบไม่สามารถประมวลผลการอัปโหลดได้</p>
            <p className="text-slate-400">กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองอีกครั้ง</p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg transition"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      )}
    </div>
  );
};
