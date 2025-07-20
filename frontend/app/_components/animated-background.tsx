'use client';

import { motion } from 'motion/react';

// Static color for the aurora gradient
const STATIC_COLOR = "#13FFAA";

export default function AnimatedBackground() {
    const backgroundImage = `radial-gradient(125% 125% at 50% 0%, #020617 60%, ${STATIC_COLOR})`;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Aurora gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{ backgroundImage }}
      />
      

    </div>
  );
} 