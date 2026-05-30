"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center mb-6 shadow-lg">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-2">
        Xiriirka ma jiro
      </h1>
      <p className="text-muted-foreground text-sm mb-1">You are offline</p>
      <p className="text-muted-foreground text-xs max-w-xs mb-8">
        Fadlan hubi internetkaaga oo mar kale isku day.
        <br />
        <span className="text-[11px]">
          Please check your connection and try again.
        </span>
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 gradient-primary text-white text-sm font-semibold rounded-2xl shadow-md active:scale-95 transition-transform"
      >
        Isku day — Try again
      </button>
    </div>
  );
}
