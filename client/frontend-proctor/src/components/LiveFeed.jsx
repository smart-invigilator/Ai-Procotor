import { useEffect, useRef, useState } from "react";
import { Video, Monitor, WifiOff } from "lucide-react";
import { monitorService } from "../services/socket";

export default function LiveFeed({ type = "face", studentId, connected = true, size = "sm" }) {
  const [frame, setFrame] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!studentId) return;
    const event = type === "face" ? "frame:webcam" : "frame:screen";
    const cached = monitorService.getFrame(type === "face" ? "webcam" : "screen", studentId);
    if (cached) setFrame(cached);
    const off = monitorService.on(event, ({ studentId: sid, image }) => {
      if (sid === studentId) setFrame(image);
    });
    return off;
  }, [studentId, type]);

  useEffect(() => {
    if (frame || !connected) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;
    const draw = () => {
      const { width: w, height: h } = canvas;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(59,130,246,0.5)";
      ctx.strokeRect(w * 0.3, h * 0.2, w * 0.4, h * 0.55);
      ctx.fillStyle = "rgba(96,165,250,0.8)";
      ctx.beginPath(); ctx.arc(w / 2 - 20, h / 2 - 10, 3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(w / 2 + 20, h / 2 - 10, 3, 0, 7); ctx.fill();
      t++;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [frame, connected]);

  const Icon = type === "face" ? Video : Monitor;
  const heights = { sm: "h-24", md: "h-32", lg: "h-72" };

  if (!connected) {
    return (
      <div className={`relative ${heights[size]} w-full rounded-lg bg-slate-200 dark:bg-slate-800 flex flex-col items-center justify-center gap-1 text-slate-400`}>
        <WifiOff className="h-5 w-5" />
        <span className="text-[10px] font-medium uppercase tracking-wide">Offline</span>
      </div>
    );
  }

  return (
    <div className={`relative ${heights[size]} w-full overflow-hidden rounded-lg bg-slate-900`}>
      {frame ? (
        <img src={`data:image/jpeg;base64,${frame}`} alt="Live Feed" className="h-full w-full object-cover" />
      ) : (
        <canvas ref={canvasRef} width={320} height={size === "lg" ? 320 : 140} className="h-full w-full object-cover" />
      )}
      <div className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/50 px-1.5 py-0.5 backdrop-blur">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white">Live</span>
      </div>
      <div className="absolute right-2 top-2 flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5 text-white backdrop-blur">
        <Icon className="h-3 w-3" />
        <span className="text-[9px] font-medium capitalize">{type}</span>
      </div>
    </div>
  );
}
