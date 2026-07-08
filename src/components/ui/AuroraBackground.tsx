/**
 * Ambient animated aurora — soft drifting gradient blobs behind the app.
 * Pure CSS (Tailwind keyframes), no JS, so it costs nothing on the main thread.
 */
export default function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-canvas" />
      <div className="absolute -left-40 -top-40 h-[40rem] w-[40rem] animate-aurora-drift rounded-full bg-accent/20 blur-[120px]" />
      <div className="absolute -right-40 top-20 h-[34rem] w-[34rem] animate-aurora-drift rounded-full bg-fuchsia-500/10 blur-[120px] [animation-delay:-6s]" />
      <div className="absolute bottom-[-15rem] left-1/3 h-[34rem] w-[34rem] animate-aurora-drift rounded-full bg-indigo-500/10 blur-[120px] [animation-delay:-12s]" />
      {/* fine grid texture */}
      <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
    </div>
  );
}
