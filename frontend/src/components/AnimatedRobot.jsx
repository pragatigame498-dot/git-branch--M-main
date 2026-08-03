import React, { memo } from 'react';
import { motion } from 'framer-motion';

// ==============================================================================
// FULLY ANIMATED INTERACTIVE AI ROBOT COMPONENT
// Features: Eye blinking, slow breathing, floating, head tilt, neon eye glow,
// mouth pulse, antenna wobble, dynamic shadow, & rotating orbital thinking rings.
// ==============================================================================

function AnimatedRobot({ isThinking = false, size = 'md', className = '' }) {
  // Size presets (sm: 44px, md: 76px, lg: 130px)
  const dimensions = {
    sm: { width: 44, height: 50, viewBox: "0 0 100 120" },
    md: { width: 76, height: 88, viewBox: "0 0 100 120" },
    lg: { width: 130, height: 150, viewBox: "0 0 100 120" }
  }[size] || { width: 44, height: 50, viewBox: "0 0 100 120" };

  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}>
      {/* Rotating Orbital Loading Rings (Visible when AI is thinking) */}
      {isThinking && (
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          className="absolute inset-0 -m-4 border-2 border-dashed border-cyan-400/60 dark:border-cyan-300/80 rounded-full filter drop-shadow-[0_0_12px_rgba(34,211,238,0.8)] pointer-events-none"
        />
      )}

      {/* Floating Robot Main Body Container */}
      <motion.div
        animate={{
          y: isThinking ? [0, -10, 0] : [0, -6, 0],
          rotate: isThinking ? [-2, 2, -2] : [-1, 1, -1]
        }}
        transition={{
          repeat: Infinity,
          duration: isThinking ? 1.5 : 3.2,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.08 }}
        className="relative cursor-pointer z-10 filter drop-shadow-2xl"
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          viewBox={dimensions.viewBox}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft Neon Body Gradients */}
            <linearGradient id="robotHeadGrad" x1="20" y1="20" x2="80" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={isThinking ? "#00F2FE" : "#8E72FF"} />
              <stop offset="100%" stopColor={isThinking ? "#4FACFE" : "#5B36F5"} />
            </linearGradient>

            <linearGradient id="robotBodyGrad" x1="15" y1="65" x2="85" y2="110" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2A2D3E" />
              <stop offset="100%" stopColor="#181A26" />
            </linearGradient>

            <linearGradient id="eyeGlowGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={isThinking ? "#00FFFF" : "#A78BFA"} />
              <stop offset="100%" stopColor={isThinking ? "#38BDF8" : "#818CF8"} />
            </linearGradient>

            {/* Neon Glow Filters */}
            <filter id="neonGlowEye" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={isThinking ? "4" : "2"} result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. ANTENNA & WOBBLING TIP */}
          <g>
            <line x1="50" y1="20" x2="50" y2="7" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
            <motion.circle
              cx="50"
              cy="5"
              r="4.5"
              fill={isThinking ? "#00FFFF" : "#8E72FF"}
              animate={{
                scale: isThinking ? [1, 1.4, 1] : [1, 1.15, 1],
                filter: isThinking 
                  ? "drop-shadow(0 0 8px #00FFFF)" 
                  : "drop-shadow(0 0 4px #8E72FF)"
              }}
              transition={{ repeat: Infinity, duration: isThinking ? 0.8 : 2 }}
            />
          </g>

          {/* 2. EARS & SIDE LIGHTS */}
          <rect x="14" y="32" width="6" height="14" rx="3" fill="#64748B" />
          <rect x="80" y="32" width="6" height="14" rx="3" fill="#64748B" />

          {/* 3. HEAD STRUCTURE */}
          <rect
            x="18"
            y="18"
            width="64"
            height="44"
            rx="16"
            fill="url(#robotHeadGrad)"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            className="transition-colors duration-500"
          />

          {/* 4. VISOR GLASS SCREEN */}
          <rect x="24" y="24" width="52" height="32" rx="12" fill="#0F172A" />

          {/* 5. BLINKING NEON EYES */}
          {/* Left Eye */}
          <g>
            <motion.ellipse
              cx="39"
              cy="38"
              rx="6"
              ry="7"
              fill="url(#eyeGlowGrad)"
              filter="url(#neonGlowEye)"
              animate={{
                scaleY: [1, 1, 0.1, 1, 1],
                opacity: isThinking ? [0.9, 1, 0.9] : 1
              }}
              transition={{
                scaleY: { repeat: Infinity, duration: 4, times: [0, 0.9, 0.93, 0.96, 1] },
                opacity: { repeat: Infinity, duration: 1 }
              }}
            />
            {/* Eye Pupil Sparkle */}
            <circle cx="37" cy="36" r="2" fill="#FFFFFF" opacity="0.9" />
          </g>

          {/* Right Eye */}
          <g>
            <motion.ellipse
              cx="61"
              cy="38"
              rx="6"
              ry="7"
              fill="url(#eyeGlowGrad)"
              filter="url(#neonGlowEye)"
              animate={{
                scaleY: [1, 1, 0.1, 1, 1],
                opacity: isThinking ? [0.9, 1, 0.9] : 1
              }}
              transition={{
                scaleY: { repeat: Infinity, duration: 4, times: [0, 0.9, 0.93, 0.96, 1] },
                opacity: { repeat: Infinity, duration: 1 }
              }}
            />
            {/* Eye Pupil Sparkle */}
            <circle cx="59" cy="36" r="2" fill="#FFFFFF" opacity="0.9" />
          </g>

          {/* 6. MOUTH & SMILE / PULSE ANIMATION */}
          {isThinking ? (
            /* Thinking Mouth Waveform Lines */
            <g>
              <motion.line
                x1="40" y1="48" x2="44" y2="48"
                stroke="#00FFFF" strokeWidth="2.5" strokeLinecap="round"
                animate={{ y: [-1.5, 1.5, -1.5] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
              />
              <motion.line
                x1="47" y1="48" x2="53" y2="48"
                stroke="#00FFFF" strokeWidth="2.5" strokeLinecap="round"
                animate={{ y: [1.5, -1.5, 1.5] }}
                transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }}
              />
              <motion.line
                x1="56" y1="48" x2="60" y2="48"
                stroke="#00FFFF" strokeWidth="2.5" strokeLinecap="round"
                animate={{ y: [-1.5, 1.5, -1.5] }}
                transition={{ repeat: Infinity, duration: 0.4, delay: 0.2 }}
              />
            </g>
          ) : (
            /* Idle Confident Smile */
            <path
              d="M 42 47 Q 50 53 58 47"
              stroke="#A78BFA"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* 7. CHEEK BLUSH */}
          <circle cx="31" cy="46" r="3" fill="#F472B6" opacity="0.4" />
          <circle cx="69" cy="46" r="3" fill="#F472B6" opacity="0.4" />

          {/* 8. NECK */}
          <rect x="44" y="62" width="12" height="6" rx="2" fill="#475569" />

          {/* 9. BODY STRUCTURE */}
          <rect
            x="24"
            y="68"
            width="52"
            height="42"
            rx="14"
            fill="url(#robotBodyGrad)"
            stroke="#475569"
            strokeWidth="2"
          />

          {/* 10. CHEST AI CORE GLOW BUTTON */}
          <motion.circle
            cx="50"
            cy="88"
            r="8"
            fill={isThinking ? "#00F2FE" : "#8E72FF"}
            animate={{
              scale: isThinking ? [1, 1.2, 1] : [1, 1.08, 1],
              opacity: isThinking ? [0.8, 1, 0.8] : [0.7, 0.9, 0.7]
            }}
            transition={{ repeat: Infinity, duration: isThinking ? 0.7 : 2 }}
          />
          <circle cx="50" cy="88" r="4" fill="#FFFFFF" opacity="0.8" />
        </svg>
      </motion.div>

      {/* DYNAMIC DOCK SHADOW ANIMATION */}
      <motion.div
        animate={{
          scaleX: isThinking ? [0.7, 0.9, 0.7] : [0.85, 1, 0.85],
          opacity: isThinking ? [0.2, 0.4, 0.2] : [0.3, 0.5, 0.3]
        }}
        transition={{
          repeat: Infinity,
          duration: isThinking ? 1.5 : 3.2,
          ease: "easeInOut"
        }}
        className="w-16 h-3 bg-slate-900/40 dark:bg-purple-950/60 rounded-full filter blur-xs mt-1"
      />
    </div>
  );
}

export default memo(AnimatedRobot);
