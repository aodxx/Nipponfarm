export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  isLineValid: boolean;
}

export interface ReceiptAnalysis {
  merchantName: string;
  date: string;
  totalAmount: number;
  items: ReceiptItem[];
  isCorrect: boolean;
  analysisNote: string;
  isValidBill?: boolean;
  rejectionReason?: string;
}

export const analyzeReceipt = async (
  base64Image: string, 
  historicalContext?: string[],
  historicalVendors?: string[]
): Promise<ReceiptAnalysis> => {
  try {
    const response = await fetch(`/api/receipt-analyze?t=${Date.now()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        image: base64Image,
        historicalDescriptions: historicalContext, // Pass historical product names
        historicalVendors: historicalVendors // Pass historical vendor names
      }),
    });

    let responseText = await response.text();
    if (!response.ok) {
      let errorMessage = "การวิเคราะห์ล้มเหลว";
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = `เซิร์ฟเวอร์ตอบกลับผิดพลาด: HTTP ${response.status}`;
      }
      throw new Error(errorMessage);
    }

    try {
      const result = JSON.parse(responseText);
      return result as ReceiptAnalysis;
    } catch (e) {
      console.error("Failed to parse success response:", responseText);
      if (responseText.includes("<!doctype html>") || responseText.includes("<html")) {
        throw new Error("เซิร์ฟเวอร์ตอบกลับเป็นหน้าเว็บ (HTML) แทนที่จะเป็นข้อมูลการวิเคราะห์ โปรดลองรอสักครู่แล้วลองอีกครั้ง หรือตรวจสอบการเชื่อมต่อ");
      }
      throw new Error(`รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง (JSON parse error). ตัวอย่างข้อมูล: ${responseText.substring(0, 100)}`);
    }
  } catch (error) {
    console.error("Analysis service error:", error);
    throw error;
  }
};

/**
 * Text-to-Speech using Web Speech API (Free fallback)
 */
export const speakText = (text: string) => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Web Speech API not supported in this browser.");
  }
};

let currentAudioSource: AudioBufferSourceNode | null = null;
let audioContextInstance: AudioContext | null = null;

// Proactively initialize and resume AudioContext on the first real user gesture
if (typeof window !== 'undefined') {
  const initAudioAndResume = () => {
    try {
      if (!audioContextInstance) {
        audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      if (audioContextInstance && audioContextInstance.state === 'suspended') {
        audioContextInstance.resume().catch(err => {
          console.warn("Failed to resume AudioContext during user interaction:", err);
        });
      }
    } catch (e) {
      console.warn("Could not setup audio context during interaction:", e);
    }
    // Remove listeners once run once
    window.removeEventListener('click', initAudioAndResume, true);
    window.removeEventListener('touchstart', initAudioAndResume, true);
  };
  window.addEventListener('click', initAudioAndResume, true);
  window.addEventListener('touchstart', initAudioAndResume, true);
}

/**
 * Decodes 24kHz 16-bit mono Little-Endian PCM raw bytes (Base64)
 * and plays them via the Web Audio API with zero latency
 */
export const playPCM24kHz = async (base64PCM: string) => {
  try {
    // 1. Cancel previous playback if still running
    if (currentAudioSource) {
      try {
        currentAudioSource.stop();
      } catch (e) {}
      currentAudioSource = null;
    }

    // Cancel any active Web Speech syntheses so they don't overlap
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    const binary = atob(base64PCM);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const buffer = bytes.buffer;
    const view = new DataView(buffer);
    const numSamples = buffer.byteLength / 2; // 16-bit is 2 bytes per sample
    
    if (!audioContextInstance) {
      audioContextInstance = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    
    if (audioContextInstance.state === 'suspended') {
      try {
        await audioContextInstance.resume();
      } catch (e) {
        console.warn("Failed to resume AudioContext dynamically:", e);
      }
    }

    // Create a 24kHz Mono AudioBuffer
    const audioBuffer = audioContextInstance.createBuffer(1, numSamples, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    for (let i = 0; i < numSamples; i++) {
      const sample = view.getInt16(i * 2, true); // true = raw little-endian
      channelData[i] = sample / 32768.0;         // convert to float [-1.0, 1.0]
    }
    
    const source = audioContextInstance.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextInstance.destination);
    source.start(0);
    currentAudioSource = source;
  } catch (err) {
    console.error("Raw PCM 24kHz playback failure:", err);
    throw err; // bubble up to trigger SpeechSynthesis fallback if Web Audio actually crashes
  }
};

/**
 * Client-side local voice synthesis speaking clearly in Thai (zero-latency, offline-friendly)
 */
export const speakWithAIVoice = async (text: string): Promise<void> => {
  console.log("-> Speaking local Web Speech TTS:", text);
  speakText(text);
};
