import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, Code2, Briefcase } from 'lucide-react';
import robotImg from '../assets/robot.png';

// ==============================================================================
// PERFORMANCE & ANIMATION OPTIMIZATION:
// Framer Motion entrance & hover animations for Suggestion Cards.
// ==============================================================================

function SuggestionCards({ onSelectCard, onOpenUploadModal }) {
  const suggestions = [
    {
      title: "JavaScript Variables",
      desc: "Syntax, Naming Rules, & Declarations",
      icon: <Code2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      prompt: "javascript variable name"
    },
    {
      title: "JavaScript Founder",
      desc: "Creator, Year (1995), & Netscape History",
      icon: <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />,
      prompt: "javascript founder name"
    },
    {
      title: "JavaScript Data Types",
      desc: "Primitive & Reference Data Types",
      icon: <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
      prompt: "javascript data types"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[55vh] text-center px-4"
    >
      {/* Clean 3D Thinking Robot Hero Image */}
      <motion.div 
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="relative mb-3 cursor-pointer" 
        onClick={onOpenUploadModal}
      >
        <motion.div 
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
          className="w-36 h-40 flex items-center justify-center"
        >
          <img 
            src={robotImg} 
            alt="3D Thinking Robot" 
            className="w-full h-full object-contain filter drop-shadow-2xl" 
          />
        </motion.div>
      </motion.div>

      <motion.h2 
        variants={itemVariants}
        className="text-2xl font-extrabold text-[#111827] dark:text-white tracking-tight transition-colors duration-300"
      >
        ASA Bot JavaScript Intelligence
      </motion.h2>

      <motion.p 
        variants={itemVariants}
        className="text-sm text-purple-600 dark:text-purple-400 max-w-md mt-1 mb-8 font-semibold transition-colors duration-300"
      >
        प्रश्न टाइप करा किंवा खालीलपैकी एका कार्डवर क्लिक करा.
      </motion.p>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        {suggestions.map((item, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectCard(item.prompt)}
            className="group p-5 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-700/80 hover:border-[#8E72FF] dark:hover:border-purple-500 rounded-3xl cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/15 flex flex-col justify-between"
          >
            <div className="p-2.5 w-fit rounded-2xl bg-purple-100/80 dark:bg-purple-950/60 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            
            <div className="mt-4">
              <h4 className="font-semibold text-sm text-[#111827] dark:text-white group-hover:text-[#8E72FF] dark:group-hover:text-purple-400 transition-colors">
                {item.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default memo(SuggestionCards);
