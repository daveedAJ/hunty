"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console in development; swap for Sentry/LogRocket in production.
    console.error("[Hunty error boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-purple-50 to-[#f9f9ff] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex flex-col">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-[#E87785]/10 dark:bg-rose-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-[#3737A4]/10 dark:bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />

      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        {/* Illustration */}
        <div className="relative mb-10 select-none" aria-hidden="true">
          <div className="text-[clamp(96px,20vw,180px)] font-black leading-none bg-gradient-to-b from-[#E87785] to-[#3737A4] bg-clip-text text-transparent dark:from-rose-400 dark:to-indigo-400 tracking-tighter">
            500
          </div>
          {/* Floating warning icon */}
          <div className="absolute -top-4 -right-6 md:-right-12 w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#E87785] to-[#3737A4] flex items-center justify-center shadow-xl animate-pulse">
            <AlertTriangle className="w-7 h-7 md:w-9 md:h-9 text-white" strokeWidth={2.5} />
          </div>
          {/* Decorative dots */}
          <div className="absolute -bottom-2 -left-4 flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="block w-2 h-2 rounded-full bg-[#E87785]/30 dark:bg-rose-400/30"
                style={{ opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>
        </div>

        {/* Copy */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
          Something went wrong
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg mb-2 max-w-md">
          An unexpected error occurred on our end. It&apos;s not you — it&apos;s us.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4 mb-12">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#E87785] to-[#3737A4] hover:opacity-90 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 border-2 border-[#3737A4]/30 dark:border-indigo-500/30 text-[#3737A4] dark:text-indigo-400 hover:bg-[#3737A4]/5 dark:hover:bg-indigo-500/10 font-bold px-7 py-3.5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>

        {/* What you can try */}
        <div className="w-full max-w-sm text-left bg-white/80 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-2xl p-5 mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            What you can try
          </p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-[#3737A4]/10 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3737A4] dark:bg-indigo-400" />
              </span>
              Refresh the page and try again
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-[#3737A4]/10 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3737A4] dark:bg-indigo-400" />
              </span>
              Check your internet connection
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-[#3737A4]/10 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3737A4] dark:bg-indigo-400" />
              </span>
              Clear your browser cache and reload
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-[#3737A4]/10 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3737A4] dark:bg-indigo-400" />
              </span>
              If the problem persists, report it below
            </li>
          </ul>
        </div>

        {/* Report link */}
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Still broken?{" "}
          <a
            href={`https://github.com/Samuel1-ona/hunty/issues/new?title=Error+${encodeURIComponent(error.digest ?? "unknown")}&body=${encodeURIComponent(`Error digest: ${error.digest ?? "N/A"}\n\nSteps to reproduce:\n1. \n\nExpected behavior:\n\nActual behavior:\n`)}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
          >
            Report this issue on GitHub
          </a>
        </p>
      </main>

      <Footer />
    </div>
  );
}