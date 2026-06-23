import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Home, Search, Trophy, Compass } from "lucide-react";

const SUGGESTIONS = [
  { href: "/", label: "Game Arcade", icon: Compass, desc: "Browse all active hunts" },
  { href: "/dashboard", label: "My Hunts", icon: Trophy, desc: "View hunts you've joined" },
  { href: "/hunty", label: "Create a Hunt", icon: Search, desc: "Start your own challenge" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-50 via-purple-50 to-[#f9f9ff] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex flex-col">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-[#3737A4]/10 dark:bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-[#E87785]/10 dark:bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />

      <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        {/* Illustration */}
        <div className="relative mb-10 select-none" aria-hidden="true">
          {/* Big 404 */}
          <div className="text-[clamp(96px,20vw,180px)] font-black leading-none bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent dark:from-indigo-400 dark:to-blue-300 tracking-tighter">
            404
          </div>
          {/* Floating magnifier */}
          <div className="absolute -top-4 -right-6 md:-right-12 w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-[#3737A4] to-[#E87785] flex items-center justify-center shadow-xl animate-bounce">
            <Search className="w-7 h-7 md:w-9 md:h-9 text-white" strokeWidth={2.5} />
          </div>
          {/* Decorative dots */}
          <div className="absolute -bottom-2 -left-4 flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="block w-2 h-2 rounded-full bg-[#3737A4]/30 dark:bg-indigo-400/30"
                style={{ opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>
        </div>

        {/* Copy */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
          This hunt has gone missing!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg mb-3 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist, was removed, or the link might be wrong.
        </p>

        {/* Primary CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] hover:opacity-90 text-white font-bold px-7 py-3.5 rounded-2xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] mb-12"
        >
          <Home className="w-4 h-4" />
          Back to Game Arcade
        </Link>

        {/* Search suggestions */}
        <div className="w-full max-w-lg text-left">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 text-center">
            Or try one of these
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SUGGESTIONS.map(({ href, label, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-800/60 hover:border-[#3737A4]/40 hover:shadow-md dark:hover:border-indigo-500/40 transition-all text-center"
              >
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3737A4]/10 to-[#E87785]/10 dark:from-indigo-900/40 dark:to-pink-900/20 flex items-center justify-center group-hover:from-[#3737A4]/20 group-hover:to-[#E87785]/20 transition-all">
                  <Icon className="w-5 h-5 text-[#3737A4] dark:text-indigo-400" />
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{label}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{desc}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Report link */}
        <p className="mt-10 text-xs text-slate-400 dark:text-slate-500">
          Think this is a mistake?{" "}
          <a
            href="https://github.com/Samuel1-ona/hunty/issues/new"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-[#3737A4] dark:hover:text-indigo-400 transition-colors"
          >
            Report an issue
          </a>
        </p>
      </main>

      <Footer />
    </div>
  );
}