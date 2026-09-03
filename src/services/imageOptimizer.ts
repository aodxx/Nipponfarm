/**
 * Niphon Farm App - Centralized Image Optimization Pipeline
 * Provides:
 * 1. High-fidelity client-side pre-compression (WebP / JPEG conversion)
 * 2. Automatic resizing based on target use-case (bils, profiles, signatures, general)
 * 3. Readability protection for documents (contracts/bills) and fine lines (signatures)
 * 4. ImageKit gateway routing with seamless native Storage fallback
 */

import { auth, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { authenticatedFetch } from '../lib/authenticatedFetch';

export interface OptimizationOptions {
  type: 'document' | 'signature' | 'profile' | 'general';
  quality?: number; // 0.0 to 1.0 override
  maxWidth?: number; // width override
  maxHeight?: number; // height override
}

/**
 * Compresses and converts an image file or Base64 data URL to optimized WebP (or JPEG fallback)
 * targeting the specified use-case requirements.
 */
export async function optimizeImage(
  imageSource: File | string,
  options: OptimizationOptions
): Promise<{
  dataUrl: string;
  blob: Blob;
  mimeType: string;
  originalSizeKB: number;
  optimizedSizeKB: number;
}> {
  return new Promise((resolve, reject) => {
    let originalSizeKB = 0;
    
    // Calculate original size
    if (imageSource instanceof File) {
      originalSizeKB = Math.round(imageSource.size / 1024);
    } else if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
      const base64Str = imageSource.split(',')[1] || '';
      originalSizeKB = Math.round((base64Str.length * 3) / 4 / 1024);
    }

    // Load image
    const img = new Image();
    img.onload = () => {
      try {
        // Set up dimensions based on type to preserve readability and balance size
        let targetWidth = img.width;
        let targetHeight = img.height;

        // Default dimensions for different use-cases
        let maxDimension = 1600; // default for high-readability bills
        let quality = 0.83; // optimized for 200-400KB size & 100% readability

        if (options.type === 'profile') {
          maxDimension = 400; // smaller for profiles
          quality = 0.85;
        } else if (options.type === 'signature') {
          maxDimension = 600; // perfect for digital signature lines
          quality = 0.90; // higher quality to prevent line blurring
        } else if (options.type === 'document') {
          maxDimension = 1600; // preserve document details/text
          quality = 0.82; // balanced to target ~200-400KB
        } else if (options.type === 'general') {
          maxDimension = 1200;
          quality = 0.82;
        }

        // Apply overrides if provided
        if (options.maxWidth) maxDimension = options.maxWidth;
        if (options.quality !== undefined) quality = options.quality;

        // Resize calculation (preserving aspect ratio)
        if (img.width > maxDimension || img.height > maxDimension) {
          if (img.width > img.height) {
            targetHeight = Math.round((img.height * maxDimension) / img.width);
            targetWidth = maxDimension;
          } else {
            targetWidth = Math.round((img.width * maxDimension) / img.height);
            targetHeight = maxDimension;
          }
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Could not get 2D context from canvas');
        }

        // Fill background white for JPEGs/PNG transparent zones
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Try WebP compression first as requested by brief ("Format Conversion to WebP")
        let mimeType = 'image/webp';
        let dataUrl = canvas.toDataURL('image/webp', quality);

        // Fallback to JPEG if WebP support fails or if canvas generation is empty
        if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
          mimeType = 'image/jpeg';
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Convert data URL to Blob
        const arr = dataUrl.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const actualMimeType = mimeMatch ? mimeMatch[1] : mimeType;
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: actualMimeType });
        const optimizedSizeKB = Math.round(blob.size / 1024);

        console.log(`[Central Image Optimizer] Resized: ${img.width}x${img.height} -> ${targetWidth}x${targetHeight}. Format: ${actualMimeType}. Size: ${originalSizeKB}KB -> ${optimizedSizeKB}KB (Target: 200-400KB)`);

        resolve({
          dataUrl,
          blob,
          mimeType: actualMimeType,
          originalSizeKB,
          optimizedSizeKB,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => reject(new Error('Failed to load image source: ' + e));

    // Handle source types
    if (imageSource instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(imageSource);
    } else {
      img.src = imageSource;
    }
  });
}

/**
 * Global function to upload the optimized image to the Centralized Image Gateway
 * It uploads to ImageKit.io (if configured in Server), otherwise gracefully
 * falls back to uploading directly to Firebase Storage.
 */
export async function uploadOptimizedImage(
  optimizedData: { dataUrl: string; blob: Blob; mimeType: string } | string,
  destinationPath: string // e.g. 'bills/userid/filename'
): Promise<string> {
  let dataUrl = '';
  let blob: Blob | null = null;
  let mimeType = 'image/webp';

  if (typeof optimizedData === 'string') {
    dataUrl = optimizedData;
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      mimeType = mimeMatch ? mimeMatch[1] : 'image/webp';
      const bstr = atob(arr[1] || '');
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mimeType });
    } catch (e) {
      console.warn('[Central Image Optimizer] Failed to parse raw string dataUrl, creating fallback blob:', e);
      blob = new Blob([], { type: 'image/webp' });
    }
  } else {
    dataUrl = optimizedData.dataUrl;
    blob = optimizedData.blob;
    mimeType = optimizedData.mimeType;
  }

  try {
    // 1. Try uploading to ImageKit gateway via server proxy endpoint
    const response = await authenticatedFetch('/api/upload-gateway', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: dataUrl,
        path: destinationPath,
      }),
    });

    if (response.ok) {
      const resData = await response.json();
      if (resData.success && resData.url) {
        console.log('[Central Upload Gateway] Uploaded via Gateway:', resData.url);
        return resData.url;
      }
    }
    
    // Log fallback action
    console.warn('[Central Upload Gateway] Gateway not active or failed. Falling back to native Firebase Storage.');
  } catch (err) {
    console.warn('[Central Upload Gateway] API request to upload gateway failed, falling back to Firebase Storage:', err);
  }

  // 2. Native Firebase Storage upload as stable, bulletproof fallback (Lazy initialization rule compliant)
  const storageRef = ref(storage, destinationPath);
  await uploadBytes(storageRef, blob, { contentType: mimeType });
  return await getDownloadURL(storageRef);
}
