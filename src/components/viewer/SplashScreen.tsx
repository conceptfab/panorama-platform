'use client';

interface SplashScreenProps {
  projectName: string;
  progress: number;
  fadeDuration: number;
}

export function SplashScreen({
  projectName,
  progress,
  fadeDuration,
}: SplashScreenProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity"
      style={{
        transitionDuration: `${fadeDuration}ms`,
      }}
    >
      <div className="w-full max-w-md px-4 text-center">
        <h1 className="text-white text-3xl font-semibold mb-4 flex flex-wrap items-baseline justify-center gap-2">
          <span className="text-[0.7em]">CONCEPTFAB</span>
          <span className="text-white/80 text-[0.91em] font-normal">
            Pano{' '}
            <span className="text-[15px]">
              v: {process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'}
            </span>
          </span>
        </h1>
        <p className="text-zinc-400 text-4xl font-thin mb-8 text-center w-full">
          {projectName}
        </p>

        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-zinc-500 text-sm mt-4">Ładowanie panoram...</p>
      </div>
    </div>
  );
}
