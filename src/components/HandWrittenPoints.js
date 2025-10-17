"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import "./css/handwritten.css";

export default function HandwrittenPaper({ children }) {
  const containerRef = useRef(null);

  // Motion values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useMotionValue(25); // rotación inicial X
  const rotateY = useMotionValue(0);  // rotación inicial Y
  const rotateZ = -5;                 // rotación inicial Z fija

  // Ajuste de tilt dinámico con mouse
  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + rect.width / 2);
    const offsetY = e.clientY - (rect.top + rect.height / 2);

    const factor = 0.15; // suaviza el efecto
    rotateY.set(offsetX * factor);
    rotateX.set(25 - offsetY * factor); // suma a la rotación inicial
  };

  const handleMouseLeave = () => {
    rotateX.set(25);
    rotateY.set(0);
  };

  return (
    <main className="flex justify-center items-center perspective-[1000px]">
      <motion.div
        ref={containerRef}
        className="handwritten-paper"
        style={{
          x,
          y,
          rotateX,
          rotateY,
          rotateZ,
          cursor: "grab",
          transformOrigin: "center",
          transformStyle: "preserve-3d",
          z: 50,
        }}
        drag
        dragConstraints={{ top: 0, right: 0, bottom: 0, left: 0 }}
        dragElastic={0.6}
        whileTap={{ cursor: "grabbing" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </motion.div>
    </main>
  );
}
