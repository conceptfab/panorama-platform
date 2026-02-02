'use client';

interface SplashScreenProps {
  projectName: string;
  progress: number;
  fadeDuration: number;
}

export function SplashScreen({ projectName, progress, fadeDuration }: SplashScreenProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity"
      style={{
        transitionDuration: `${fadeDuration}ms`,
      }}
    >
      <div className="text-center">
        <h1 className="text-white text-3xl font-semibold mb-2">
          CONCEPTFAB
        </h1>
        <p className="text-zinc-400 text-lg mb-8">
          {projectName}
        </p>

        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-zinc-500 text-sm mt-4">
          Ładowanie panoram...
        </p>
      </div>
    </div>
  );
}
