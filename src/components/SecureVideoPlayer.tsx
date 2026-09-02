import React, { useState, useEffect } from "react";
import { Play, AlertCircle, Loader2 } from "lucide-react";

interface SecureVideoPlayerProps {
  videoUrl: string | null | undefined;
  userId: string | null | undefined;
  className?: string;
  controls?: boolean;
}

export const SecureVideoPlayer: React.FC<SecureVideoPlayerProps> = ({
  videoUrl,
  userId,
  className = "w-full rounded-xl overflow-hidden shadow-lg",
  controls = true
}) => {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoUrl || !userId) {
      setPlayUrl(null);
      return;
    }

    const fetchSignedUrl = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/r2/presign-download", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId,
            key: videoUrl
          })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          setPlayUrl(data.downloadUrl);
        } else {
          setError(data.error || "ไม่สามารถดึงลิงก์เปิดดูวิดีโอส่วนตัวได้");
        }
      } catch (err: any) {
        console.error("Error fetching signed URL:", err);
        setError("เชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านล้มเหลว");
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [videoUrl, userId]);

  if (!videoUrl) return null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-xl p-8 text-center min-h-[200px]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
        <p className="text-xs text-slate-400 font-mono">กำลังตรวจสอบสิทธิ์และสร้างสตรีมมิ่งเซสชัน...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-rose-950/40 border border-rose-900/50 rounded-xl p-6 text-center min-h-[200px]">
        <AlertCircle className="h-8 w-8 text-rose-400 mb-2" />
        <p className="text-sm font-semibold text-rose-200">เข้าถึงวิดีโอล้มเหลว</p>
        <p className="text-xs text-rose-300 mt-1 max-w-xs">{error}</p>
      </div>
    );
  }

  if (!playUrl) return null;

  return (
    <div className={`relative bg-black group ${className}`}>
      <video
        src={playUrl}
        controls={controls}
        playsInline
        className="w-full h-full max-h-[480px] object-contain rounded-xl"
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};
