import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Video, Mic, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { createNewsPost } from '../../services/newsService';
import imageCompression from 'browser-image-compression';

export default function CreatePostForm() {
  const { user, userProfile } = useAuth();
  const { showAlert, showSuccess, showError, showLoading, hideLoading } = useBottomSheet();
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setCompressing(true);

      try {
        const compressedFiles = await Promise.all(
          files.map(async (file) => {
            if (!file.type.startsWith('image/')) return file;
            
            const options = {
              maxSizeMB: 1,      // Max size in MB
              maxWidthOrHeight: 1280, // Max dimension
              useWebWorker: true,
            };
            
            try {
              const compressedBlob = await imageCompression(file, options);
              // convert blob back to file so it maintains name/type
              return new File([compressedBlob], file.name, { type: file.type });
            } catch (err) {
              console.error("Compression failed for", file.name, err);
              return file; // If compression fails, use original
            }
          })
        );
        
        const validFiles = compressedFiles.filter(f => f.size <= 10 * 1024 * 1024); // Max 10MB just as a final check
        
        if (imageFiles.length + validFiles.length > 3) {
          showAlert('อัปโหลดรูปภาพได้สูงสุด 3 รูปเท่านั้น');
          if (imageInputRef.current) imageInputRef.current.value = '';
          return;
        }
        
        setImageFiles(prev => [...prev, ...validFiles]);
      } catch (error) {
        console.error("Compression error:", error);
        showAlert('เกิดข้อผิดพลาดในการบีบอัดรูปภาพ');
      } finally {
        setCompressing(false);
      }
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) { // Max 50MB
        showAlert('ขนาดวิดีโอต้องไม่เกิน 50MB');
        if (videoInputRef.current) videoInputRef.current.value = '';
        return;
      }
      setVideoFile(file);
    }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 20 * 1024 * 1024) { // Max 20MB
        showAlert('ขนาดไฟล์เสียงต้องไม่เกิน 20MB');
        if (audioInputRef.current) audioInputRef.current.value = '';
        return;
      }
      setAudioFile(file);
    }
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const removeAudio = () => {
    setAudioFile(null);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && imageFiles.length === 0 && !videoFile && !audioFile) return;
    if (!user) return;

    setLoading(true);
    showLoading('กำลังอัปโหลดไฟล์สื่อและบันทึกโพสต์ข่าวสาร...', 'กำลังส่งข้อมูล');
    try {
      await createNewsPost(
        user.uid,
        user.displayName || userProfile?.displayName || 'ผู้ใช้งาน',
        user.photoURL || undefined,
        content,
        imageFiles,
        videoFile,
        audioFile
      );
      setContent('');
      setImageFiles([]);
      setVideoFile(null);
      setAudioFile(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
      hideLoading();
      showSuccess('สร้างโพสต์ลงบอร์ดข่าวสารเรียบร้อยแล้ว', 'โพสต์สำเร็จ');
    } catch (error: any) {
      hideLoading();
      console.error("Create post error:", error);
      if (error && error.code === 'storage/unknown') {
        showError('ระบบพื้นที่เก็บไฟล์ยังไม่เปิดใช้งาน กรุณาตั้งค่า Firebase Storage ก่อน หรือติดต่อผู้ดูแลระบบ');
      } else {
        showError('เกิดข้อผิดพลาดในการโพสต์ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
      hideLoading();
    }
  };

  if (userProfile?.role !== 'ADMIN') return null;

  return (
    <div className="bg-white dark:bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl dark:shadow-xl border border-slate-200 dark:border-white/20">
      <div className="flex gap-3 mb-4">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-white/20 shrink-0 border border-slate-300 dark:border-white/30">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-900 dark:text-white font-bold">
              {user?.displayName?.charAt(0) || 'อ'}
            </div>
          )}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="มีอะไรอัปเดตบ้าง..."
          className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-[#00bcd4] resize-none"
          rows={2}
        />
      </div>

      {imageFiles.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {imageFiles.map((file, idx) => (
            <div key={idx} className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-white/20">
              <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
              <button 
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-black/60 p-1 rounded-full text-slate-900 dark:text-white hover:bg-black/80"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {videoFile && (
        <div className="relative mb-4 rounded-xl overflow-hidden border border-slate-200 dark:border-white/20 bg-black max-h-48 flex justify-center">
          <video src={URL.createObjectURL(videoFile)} className="max-h-48 object-contain" controls />
          <button 
            type="button"
            onClick={removeVideo}
            className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-slate-900 dark:text-white hover:bg-black/80 z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {audioFile && (
        <div className="relative mb-4 p-3 rounded-xl border border-slate-200 dark:border-white/20 bg-slate-100 dark:bg-white/5 flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-full">
            <Mic className="w-5 h-5" />
          </div>
          <audio src={URL.createObjectURL(audioFile)} className="flex-1 h-10" controls />
          <button 
            type="button"
            onClick={removeAudio}
            className="bg-black/50 p-1.5 rounded-full text-slate-900 dark:text-white hover:bg-black/80 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-white/10">
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={imageFiles.length >= 3 || loading}
            className="p-2 text-green-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            ref={imageInputRef} 
            onChange={handleImageSelect} 
            className="hidden" 
          />

          <button 
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={loading || videoFile !== null}
            className="p-2 text-rose-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <Video className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            accept="video/*" 
            ref={videoInputRef} 
            onChange={handleVideoSelect} 
            className="hidden" 
          />

          <button 
            type="button"
            onClick={() => audioInputRef.current?.click()}
            disabled={loading || audioFile !== null}
            className="p-2 text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <Mic className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            accept="audio/*" 
            ref={audioInputRef} 
            onChange={handleAudioSelect} 
            className="hidden" 
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={(!content.trim() && imageFiles.length === 0 && !videoFile && !audioFile) || loading || compressing}
          className="px-5 py-2 bg-[#00bcd4] hover:bg-[#00acc1] text-slate-900 dark:text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-95 flex items-center gap-2 shadow-[0_0_15px_rgba(0,188,212,0.3)] disabled:shadow-none"
        >
          {(loading || compressing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {compressing ? 'กำลังบีบอัด...' : 'โพสต์'}
        </button>
      </div>
    </div>
  );
}
