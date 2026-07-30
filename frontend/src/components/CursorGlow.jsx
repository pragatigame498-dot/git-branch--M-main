import React, { useState, useEffect, memo } from 'react';

// ==============================================================================
// INTERACTIVE FUTURISTIC CURSOR GLOW SPOTLIGHT
// Moves with cursor, generating a soft cyan-purple neon spotlight effect.
// ==============================================================================

function CursorGlow() {
  const [pos, setPos] = useState({ x: -200, y: -200 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-300 opacity-60 dark:opacity-80"
      style={{
        background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, rgba(142, 114, 255, 0.12), rgba(0, 242, 254, 0.06) 40%, transparent 80%)`
      }}
    />
  );
}

export default memo(CursorGlow);
