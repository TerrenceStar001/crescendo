import React, { useRef, useEffect } from 'react';

export default function WaveformDisplay({ audioLevel, isRecording, transcript, className }) {
  const canvasRef = useRef(null);
  const historyRef = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    if (isRecording) {
      historyRef.current.push(audioLevel);
      if (historyRef.current.length > 120) historyRef.current.shift();
    } else {
      if (historyRef.current.length > 0) {
        const decay = () => {
          historyRef.current = historyRef.current.slice(0, -2);
          if (historyRef.current.length > 0) animRef.current = requestAnimationFrame(decay);
        };
        decay();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const bars = historyRef.current;
      if (bars.length === 0) {
        ctx.fillStyle = 'var(--color-border)';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(isRecording ? 'Listening...' : '—', W / 2, H / 2 + 4);
        return;
      }
      const barW = W / bars.length;
      bars.forEach((level, i) => {
        const h = level * H * 0.9;
        const x = i * barW;
        const y = (H - h) / 2;
        const hue = 240 - level * 120;
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x, y, Math.max(1, barW - 1), h);
      });
    }
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [audioLevel, isRecording]);

  useEffect(() => {
    if (!isRecording) {
      historyRef.current = [];
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'var(--color-border)';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('—', canvas.width / 2, canvas.height / 2 + 4);
    }
  }, [isRecording]);

  return (
    <div className={`waveform${className ? ' ' + className : ''}`}>
      <canvas ref={canvasRef} width={400} height={80} className="waveform__canvas" />
      {transcript && (
        <div className="waveform__transcript">
          {transcript}
          {isRecording && <span className="waveform__cursor">|</span>}
        </div>
      )}
    </div>
  );
}
