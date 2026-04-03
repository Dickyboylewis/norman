"use client";

import { useState } from "react";
import Image from "next/image";
import { AskJebPanel } from "./ask-jeb-panel";

export function AskJebButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 rounded-full border-[3px] border-[#DA2C26] shadow-lg hover:scale-110 transition-transform duration-200 z-50 overflow-hidden relative"
        aria-label="Ask Jeb Blount for sales coaching"
      >
        <Image
          src="/Jeb-Blount.png"
          alt="Jeb Blount"
          fill
          className="object-cover"
        />
        {/* Notification dot */}
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#DA2C26] rounded-full animate-pulse" />
      </button>

      <AskJebPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
