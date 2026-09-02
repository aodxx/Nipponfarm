import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onEnd: (signatureBase64: string) => void;
  width?: number;
  height?: number;
}

export default function SignaturePad({ onEnd, width = 400, height = 200 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height); // fill background white initially
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
      }
    }
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e, false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, drawLine: boolean = true) => {
    if (!isDrawing && drawLine) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (!drawLine) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onEnd(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
      onEnd(''); // clear sig
    }
  };

  // Prevent scrolling when drawing on touch devices
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (e.target === canvasRef.current) {
        e.preventDefault();
      }
    };
    document.body.addEventListener('touchmove', preventScroll, { passive: false });
    return () => document.body.removeEventListener('touchmove', preventScroll);
  }, []);

  return (
    <div className="relative border-2 border-gray-300 border-dashed rounded-xl overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={startDrawing}
        onMouseMove={(e) => draw(e)}
        onMouseUp={endDrawing}
        onMouseOut={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={(e) => draw(e)}
        onTouchEnd={endDrawing}
        className="w-full h-full cursor-crosshair touch-none"
        style={{ width: '100%', height: `${height}px` }}
      />
      <button 
        type="button" 
        onClick={clear}
        className="absolute top-2 right-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded shadow-xl font-medium"
      >
        ล้างลายเซ็น
      </button>
    </div>
  );
}
