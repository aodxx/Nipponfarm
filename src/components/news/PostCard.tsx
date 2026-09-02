import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal, Trash2, Clock, Heart, Download, X } from 'lucide-react';
import { NewsPost } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { deleteNewsPost, toggleNewsPostLike } from '../../services/newsService';

interface PostCardProps {
  post: NewsPost;
}

export default function PostCard({ post }: PostCardProps) {
  const { user, userProfile } = useAuth();
  const { showConfirm, showAlert } = useBottomSheet();
  const [showMenu, setShowMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const isAdmin = userProfile?.role === 'ADMIN';
  const isOwner = user?.uid === post.userId;

  const isLiked = post.likedBy?.includes(user?.uid || '') || false;
  const likeCount = post.likedBy?.length || 0;

  const handleLike = async () => {
    if (!user || !post.id || isLiking) return;
    setIsLiking(true);
    try {
      await toggleNewsPostLike(post.id, user.uid, isLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `farm-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback: Open in new tab if CORS prevents download
      window.open(url, '_blank');
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
    showConfirm('คุณต้องการลบโพสต์นี้ใช่หรือไม่?', async () => {
      try {
        await deleteNewsPost(post);
      } catch (error) {
        showAlert('ไม่สามารถลบโพสต์ได้');
      }
    });
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString('th-TH', { 
      day: 'numeric', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="bg-white dark:bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl dark:shadow-xl border border-slate-200 dark:border-white/20 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-white/20 border border-slate-300 dark:border-white/30">
            {post.authorPhotoUrl ? (
              <img src={post.authorPhotoUrl} alt={post.authorName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-900 dark:text-white font-bold">
                {post.authorName.charAt(0)}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{post.authorName}</h4>
            <p className="text-xs text-slate-600 dark:text-white/50 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" /> {formatDate(post.createdAt)}
            </p>
          </div>
        </div>

        {(isAdmin || isOwner) && (
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-600 dark:text-white/60  rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white/95 dark:bg-[#0a2e36]/95 backdrop-blur-md border border-slate-200 dark:border-white/20 rounded-xl shadow-2xl overflow-hidden z-20">
                <button 
                  onClick={handleDelete}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> ลบโพสต์
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-slate-800 dark:text-white/90 whitespace-pre-wrap text-sm md:text-base leading-relaxed">
            {post.content}
          </p>
        </div>
      )}

      {/* Media: Audio */}
      {post.audioUrl && (
        <div className="px-4 pb-3">
          <audio src={post.audioUrl} controls className="w-full h-10 rounded-full" />
        </div>
      )}

      {/* Media: Video */}
      {post.videoUrl && (
        <div className="w-full bg-black">
          <video src={post.videoUrl} controls className="w-full max-h-96 object-contain" />
        </div>
      )}

      {/* Media: Images Grid */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <div className="mt-2 w-full overflow-hidden">
          {post.imageUrls.length === 1 && (
             <img 
               src={post.imageUrls[0]} 
               alt="post" 
               className="w-full h-auto max-h-[500px] object-contain bg-black cursor-pointer active:opacity-80 transition-opacity" 
               onClick={() => setSelectedImage(post.imageUrls![0])}
             />
          )}
          {post.imageUrls.length === 2 && (
             <div className="grid grid-cols-2 gap-0.5 max-h-[400px]">
               <img src={post.imageUrls[0]} alt="post 1" className="w-full h-full object-cover aspect-square cursor-pointer active:opacity-80 transition-opacity" onClick={() => setSelectedImage(post.imageUrls![0])} />
               <img src={post.imageUrls[1]} alt="post 2" className="w-full h-full object-cover aspect-square cursor-pointer active:opacity-80 transition-opacity" onClick={() => setSelectedImage(post.imageUrls![1])} />
             </div>
          )}
          {post.imageUrls.length >= 3 && (
             <div className="grid grid-cols-2 gap-0.5">
               <div className="col-span-2 aspect-[16/9] relative bg-slate-100 dark:bg-white/5 cursor-pointer active:opacity-80 transition-opacity" onClick={() => setSelectedImage(post.imageUrls![0])}>
                 <img src={post.imageUrls[0]} alt="post 1" className="absolute w-full h-full object-cover" />
               </div>
               <div className="aspect-square relative bg-slate-100 dark:bg-white/5 cursor-pointer active:opacity-80 transition-opacity" onClick={() => setSelectedImage(post.imageUrls![1])}>
                 <img src={post.imageUrls[1]} alt="post 2" className="absolute w-full h-full object-cover" />
               </div>
               <div className="aspect-square relative bg-slate-100 dark:bg-white/5 flex items-center justify-center cursor-pointer active:opacity-80 transition-opacity" onClick={() => setSelectedImage(post.imageUrls![2])}>
                 <img src={post.imageUrls[2]} alt="post 3" className="absolute w-full h-full object-cover" />
                 {post.imageUrls.length > 3 && (
                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 backdrop-blur-sm pointer-events-none">
                     <span className="text-slate-900 dark:text-white text-3xl font-bold">+{post.imageUrls.length - 3}</span>
                   </div>
                 )}
               </div>
             </div>
          )}
        </div>
      )}

      {/* Footer / Actions */}
      <div className="px-4 py-3 flex items-center border-t border-slate-200 dark:border-white/10 mt-1">
        <button 
          onClick={handleLike} 
          disabled={isLiking}
          className={`flex items-center gap-1.5 transition-colors disabled:opacity-50 ${isLiked ? 'text-pink-400' : 'text-slate-600 dark:text-white/60 hover:text-pink-400'}`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
          <span className="text-sm font-medium">
            {likeCount > 0 ? likeCount : ''}
          </span>
        </button>
      </div>

      {/* Lightbox Portal */}
      {selectedImage && createPortal(
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/98 backdrop-blur-md p-4 animate-in fade-in duration-200" 
          onClick={() => setSelectedImage(null)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }} 
            className="absolute top-4 left-4 p-3 text-slate-600 dark:text-white/70  bg-black/50 rounded-full z-10 active:scale-95 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownload(selectedImage); }} 
            className="absolute top-4 right-4 px-4 py-2.5 text-slate-900 dark:text-white bg-indigo-600 hover:bg-indigo-500 rounded-full flex gap-2 items-center z-10 shadow-xl dark:shadow-2xl font-medium active:scale-95 transition-all"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">ดาวน์โหลดภาพ</span>
          </button>

          <img 
            src={selectedImage} 
            alt="Full screen view" 
            className="max-w-full max-h-full object-contain select-none" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
