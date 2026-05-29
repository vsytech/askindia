import React from 'react';
import { AskIndiaLogo } from './AskIndiaLogo';

/**
 * Full-page loading screen shown while lazy-loaded route chunks are downloading.
 * Keeps the AskIndia brand visible instead of a blank white flash.
 */
export const PageLoader: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-5 select-none">
    <AskIndiaLogo size={48} showText={true} textClass="text-2xl" />

    {/* Spinner */}
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent-500 animate-spin" />
    </div>

    <p className="text-sm text-slate-400 font-medium tracking-wide animate-pulse">
      Loading…
    </p>
  </div>
);

/**
 * Inline mini-loader for smaller section suspense boundaries
 */
export const InlineLoader: React.FC<{ height?: string }> = ({ height = 'h-40' }) => (
  <div className={`${height} flex items-center justify-center`}>
    <div className="w-7 h-7 rounded-full border-[3px] border-slate-100 border-t-accent-500 animate-spin" />
  </div>
);
