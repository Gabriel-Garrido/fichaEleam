import { useEffect, useRef } from 'react';

const COLORS = [
  '#0d9488', '#059669', '#3b82f6', '#8b5cf6',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
];

// Bursts colored rectangle particles from the center-top of the viewport.
export default function ConfettiCelebration({ active }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const particles = Array.from({ length: 90 }, (_, i) => {
      const angle = (Math.random() * Math.PI * 1.4) - Math.PI * 0.7; // spread upward
      const speed = Math.random() * 6 + 3;
      return {
        x: canvas.width * (0.3 + Math.random() * 0.4),
        y: canvas.height * 0.35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        w: Math.random() * 10 + 5,
        h: Math.random() * 6 + 3,
        color: COLORS[i % COLORS.length],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      };
    });

    let startTime = null;
    const duration = 3800;

    function animate(ts) {
      if (!startTime) startTime = ts;
      const t = (ts - startTime) / duration;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.18; // gravity
        p.vx *= 0.99; // air resistance
        p.rotation += p.rotSpeed;
        p.opacity = Math.max(0, 1 - t * 1.4);

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (t < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[60]"
      aria-hidden="true"
    />
  );
}
