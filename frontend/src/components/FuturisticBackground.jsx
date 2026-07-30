import React, { memo, useState, useEffect } from 'react';

// ==============================================================================
// FUTURISTIC AI ANIMATED BACKGROUND COMPONENT
// Features: Moving gradient, floating neon circles, perspective cyber grid,
// aurora wave effect, mouse parallax interaction, & lightweight CSS keyframes.
// ==============================================================================

function FuturisticBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Calculate normalized mouse coordinates (-1 to 1) for parallax
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {/* 1. Moving Aurora Gradient Wave */}
      <div 
        className="absolute -inset-[50%] opacity-40 dark:opacity-50 animate-aurora blur-3xl"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(142, 114, 255, 0.25) 0%, rgba(79, 172, 254, 0.15) 35%, rgba(15, 23, 42, 0) 70%)',
          transform: `translate3d(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px, 0)`
        }}
      />

      {/* 2. Floating Blurred Neon Blobs (Purple & Cyan) */}
      <div 
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-600/20 dark:bg-purple-600/30 blur-3xl animate-blob-1"
        style={{
          transform: `translate3d(${mousePos.x * 1.2}px, ${mousePos.y * 1.2}px, 0)`
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/20 dark:bg-cyan-500/30 blur-3xl animate-blob-2"
        style={{
          transform: `translate3d(${-mousePos.x * 1.2}px, ${-mousePos.y * 1.2}px, 0)`
        }}
      />

      {/* 3. Cyber Perspective Grid Lines */}
      <div 
        className="absolute inset-0 opacity-15 dark:opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(142, 114, 255, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(142, 114, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: `translate3d(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px, 0)`
        }}
      />

      {/* 4. Ambient Floating Tiny Particles (Lightweight CSS) */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-purple-400 dark:bg-cyan-300 shadow-[0_0_8px_rgba(0,242,254,0.8)]"
            style={{
              top: `${(i * 8.5) % 100}%`,
              left: `${(i * 14.2) % 100}%`,
              opacity: 0.3 + (i % 5) * 0.1,
              animation: `particle-float ${4 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(FuturisticBackground);
