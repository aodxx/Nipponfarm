import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, ArrowLeft } from 'lucide-react';
import { subscribeToNews } from '../../services/newsService';
import { NewsPost } from '../../types';
import CreatePostForm from '../../components/news/CreatePostForm';
import PostCard from '../../components/news/PostCard';

export default function NewsBoard() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToNews((data) => {
      setPosts(data);
      setLoading(false);
    }, 100); // load up to 100 on the board
    return unsub;
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/')}
          className="p-3 bg-white dark:bg-white/10 backdrop-blur-md rounded-full shadow-xl dark:shadow-2xl border border-slate-200 dark:border-white/20 text-slate-900 dark:text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
            <Newspaper className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">กระดานข่าวสาร</h2>
        </div>
      </div>

      <div className="space-y-6">
        <CreatePostForm />

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-[#00bcd4]/30 border-t-[#00bcd4] rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-slate-600 dark:text-white/50 bg-slate-100 dark:bg-white/5 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 border-dashed">
                ยังไม่มีการโพสต์ข่าวสาร
              </div>
            ) : (
              posts.map(post => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
