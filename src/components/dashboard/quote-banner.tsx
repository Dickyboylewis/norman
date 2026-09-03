"use client";

/**
 * Daily Quote Banner
 *
 * Full-width card with the day's rotating quote in brand red, picked
 * deterministically client-side so every user sees the same one.
 */

import { getDailyQuote } from "@/lib/motivational-quotes";

export function QuoteBanner() {
  const quote = getDailyQuote();

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="h-1 bg-[#DA2C26]" />
      <div className="px-5 py-5 md:px-8 md:py-6">
        <p className="font-[Poppins] text-xl font-bold leading-snug text-[#DA2C26] sm:text-2xl md:text-3xl">
          {quote.text}
        </p>
        <p className="mt-2 text-sm text-gray-500">&mdash; {quote.author}</p>
      </div>
    </div>
  );
}
