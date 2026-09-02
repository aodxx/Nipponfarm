import { collection, addDoc, getDocs, onSnapshot, query, orderBy, limit, deleteDoc, doc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { NewsPost } from '../types';

import { OperationType, handleFirestoreError } from '../lib/firestore-error';

export const subscribeToNews = (callback: (posts: NewsPost[]) => void, maxLimit: number = 50) => {
  const q = query(collection(db, 'news_posts'), orderBy('createdAt', 'desc'), limit(maxLimit));
  
  return onSnapshot(q, (snapshot) => {
    const posts: NewsPost[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Backwards compatibility for older posts with base64 images
      if (data.image && !data.imageUrls) {
        data.imageUrls = [data.image];
      } else if (data.images && !data.imageUrls) {
        data.imageUrls = data.images;
      }
      posts.push({ id: doc.id, ...data } as NewsPost);
    });
    callback(posts);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, 'news_posts');
  });
};

export const createNewsPost = async (
  userId: string,
  authorName: string,
  authorPhotoUrl: string | undefined,
  content: string,
  imageFiles: File[],
  videoFile: File | null,
  audioFile: File | null
) => {
  try {
    const imageUrls: string[] = [];
    let videoUrl: string | undefined = undefined;
    let audioUrl: string | undefined = undefined;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    // Upload Images
    for (const file of imageFiles) {
      if (file.size > MAX_FILE_SIZE) throw new Error(`ภาพมีขนาดใหญ่เกินไป (สูงสุด 10MB): ${file.name}`);
      const fileExt = file.name.split('.').pop();
      const fileName = `news/${Date.now()}_img_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      imageUrls.push(downloadURL);
    }

    // Upload Video
    if (videoFile) {
      if (videoFile.size > MAX_FILE_SIZE) throw new Error(`วิดีโอมีขนาดใหญ่เกินไป (สูงสุด 10MB): ${videoFile.name}`);
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `news/${Date.now()}_vid_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, videoFile);
      videoUrl = await getDownloadURL(storageRef);
    }

    // Upload Audio
    if (audioFile) {
      if (audioFile.size > MAX_FILE_SIZE) throw new Error(`ไฟล์เสียงมีขนาดใหญ่เกินไป (สูงสุด 10MB): ${audioFile.name}`);
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `news/${Date.now()}_aud_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, audioFile);
      audioUrl = await getDownloadURL(storageRef);
    }

    const newPost: any = {
      userId,
      authorName,
      content,
      imageUrls,
      createdAt: Date.now()
    };
    
    if (authorPhotoUrl) {
      newPost.authorPhotoUrl = authorPhotoUrl;
    }
    
    if (videoUrl) {
      newPost.videoUrl = videoUrl;
    }
    
    if (audioUrl) {
      newPost.audioUrl = audioUrl;
    }

    await addDoc(collection(db, 'news_posts'), newPost);
  } catch (error) {
    console.error("Error creating news post:", error);
    throw error;
  }
};

export const deleteNewsPost = async (post: NewsPost) => {
  try {
    if (!post.id) return;
    
    // 1. Delete from Firestore
    await deleteDoc(doc(db, 'news_posts', post.id));

    // 2. Clean up files from Firebase Storage
    if (post.imageUrls && post.imageUrls.length > 0) {
      for (const url of post.imageUrls) {
        try {
          const imageRef = ref(storage, url);
          await deleteObject(imageRef);
        } catch (e) {
          console.warn("Storage image might already be deleted or not found");
        }
      }
    }

    if (post.videoUrl) {
      try {
        const videoRef = ref(storage, post.videoUrl);
        await deleteObject(videoRef);
      } catch (e) {
        console.warn("Storage video might already be deleted or not found");
      }
    }

    if (post.audioUrl) {
      try {
        const audioRef = ref(storage, post.audioUrl);
        await deleteObject(audioRef);
      } catch (e) {
        console.warn("Storage audio might already be deleted or not found");
      }
    }
  } catch (error) {
    console.error("Error deleting news post:", error);
    throw error;
  }
};

export const toggleNewsPostLike = async (postId: string, userId: string, isLiked: boolean) => {
  try {
    const postRef = doc(db, 'news_posts', postId);
    if (isLiked) {
      await updateDoc(postRef, {
        likedBy: arrayRemove(userId)
      });
    } else {
      await updateDoc(postRef, {
        likedBy: arrayUnion(userId)
      });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
};
