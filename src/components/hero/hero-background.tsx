// The landing hero's background, behind the content and decorative only:
//   1. a soft brand mesh (mint on the left, a cream glow behind the phone),
//   2. three blurred blobs that drift slowly (still under reduced motion),
//   3. a faint doodle pattern of booking icons, strongest behind the phone,
//   4. a fade at the bottom into the next section's `canvas` colour.
// Colours and the pattern opacity are the --hero-* tokens in globals.css; the mesh, the
// pattern's mask and the drift animations are the .hero-* classes there.
export function HeroBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="hero-mesh absolute inset-0" />

      <div className="hero-blob hero-blob-a absolute -top-48 -left-40 size-[30rem] rounded-full bg-hero-blob-green blur-[110px]" />
      <div className="hero-blob hero-blob-b absolute top-[55%] -right-28 size-[26rem] rounded-full bg-hero-blob-amber blur-[100px] lg:top-[15%]" />
      <div className="hero-blob hero-blob-c absolute -bottom-60 left-[35%] size-[24rem] rounded-full bg-hero-blob-green blur-[120px]" />

      <svg className="hero-pattern absolute inset-0 size-full text-hero-pattern">
        <defs>
          <pattern id="hero-doodles" width="280" height="280" patternUnits="userSpaceOnUse">
            <Doodles />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-doodles)" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 h-28 bg-linear-to-b from-transparent to-canvas" />
    </div>
  );
}

/** One 280px tile of line icons: chat, calendar, clock, scissors, tooth, fork and knife, dumbbell, phone, ticks. */
function Doodles() {
  return (
    <g fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {/* Chat bubble */}
      <g transform="translate(22 26) rotate(-6)">
        <path d="M4 0h22a4 4 0 0 1 4 4v13a4 4 0 0 1-4 4H12l-7 6v-6H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" />
        <path d="M8 8h14M8 13h9" />
      </g>
      {/* Calendar */}
      <g transform="translate(116 20) rotate(5)">
        <rect y="4" width="28" height="24" rx="4" />
        <path d="M0 11h28M8 0v7M20 0v7M6 18h3M12.5 18h3M19 18h3M6 23h3" />
      </g>
      {/* Clock */}
      <g transform="translate(212 30)">
        <circle cx="13" cy="13" r="13" />
        <path d="M13 6v7l5 3" />
      </g>
      {/* Scissors */}
      <g transform="translate(30 118) rotate(14)">
        <circle cx="5" cy="5" r="5" />
        <circle cx="5" cy="23" r="5" />
        <path d="M9 8l20 16M9 20L29 4" />
      </g>
      {/* Tooth */}
      <g transform="translate(128 108) rotate(-6)">
        <path d="M6 0C1 0-1 5 1 11c1.5 5 2 9 3 14 .8 3.5 3.2 3.5 4 0l1.5-6c.5-2 2.5-2 3 0l1.5 6c.8 3.5 3.2 3.5 4 0 1-5 1.5-9 3-14 2-6 0-11-5-11-2.5 0-3.5 1.5-5.5 1.5S8.5 0 6 0z" />
      </g>
      {/* Fork and knife */}
      <g transform="translate(222 108) rotate(8)">
        <path d="M2 0v8M6 0v8M10 0v8M2 8a4 4 0 0 0 8 0M6 12v18" />
        <path d="M20 30V0c4 3 6 9 6 15h-6" />
      </g>
      {/* Dumbbell */}
      <g transform="translate(24 222) rotate(-18)">
        <path d="M8 10h18M4 4v12M8 1v18M26 1v18M30 4v12" />
      </g>
      {/* Phone handset */}
      <g transform="translate(122 206) rotate(-10)">
        <path d="M4 0h5l2.5 6-3 2a13 13 0 0 0 6.5 6.5l2-3 6 2.5v5a2 2 0 0 1-2 2A20 20 0 0 1 2 2a2 2 0 0 1 2-2z" />
      </g>
      {/* Double tick */}
      <g transform="translate(214 214)">
        <path d="M1 11l6 6L19 3M12 16l1 1L25 3" />
      </g>
      {/* Small sparkles and dots between the icons */}
      <path d="M84 72l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM186 168l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" />
      <circle cx="262" cy="90" r="2.5" />
      <circle cx="84" cy="176" r="2" />
      <circle cx="176" cy="264" r="2" />
    </g>
  );
}
