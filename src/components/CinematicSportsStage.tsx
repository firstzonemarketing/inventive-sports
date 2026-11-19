import React, { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useCms } from '../lib/cms';
import { scrollEngine } from '../lib/scroll';
import {
  CHAPTER_PROGRESS_ANCHORS,
  ChapterId,
  FOLDER_META,
  MasterTimelineEvaluation,
  SPORT_FRAME_MAP,
  SPORT_SEQUENCES,
  SequenceFolderId,
  SportStageId,
  evaluateMasterTimeline,
  heroStadiumFrames,
} from '../lib/sequences';
import { SequenceFrameCache } from '../lib/sequenceLoader';
import { CmsDiscipline } from '../content';

gsap.registerPlugin(ScrollTrigger);

interface CinematicSportsStageProps {
  reducedMotion: boolean;
}

const CHAPTER_PILLS: { id: ChapterId; label: string; shortLabel: string }[] = [
  { id: 'hero', label: '00 // STADIUM', shortLabel: 'HERO' },
  { id: 'cricket', label: '01 // CRICKET', shortLabel: 'CRICKET' },
  { id: 'football', label: '02 // FOOTBALL', shortLabel: 'FOOTBALL' },
  { id: 'basketball', label: '03 // BASKETBALL', shortLabel: 'BASKETBALL' },
  { id: 'chess', label: '04 // CHESS', shortLabel: 'CHESS' },
];

const DEFAULT_SPORT_COPY: Record<
  SportStageId,
  {
    name: string;
    tagline: string;
    scene_heading: string;
    short_description: string;
    highlights: string[];
    cta_text: string;
    route: string;
  }
> = {
  cricket: {
    name: 'Cricket',
    tagline: 'TECHNICAL BATTING, BOWLING & FIELDING MASTERY',
    scene_heading: 'PLAY WITH PURPOSE.',
    short_description:
      'Develop textbook batting technique, repeatable bowling rhythm, sharp fielding reflexes, and match temperament.',
    highlights: [
      'Dedicated net practice & bowling machine drills',
      'Match-scenario simulation & field placement strategy',
    ],
    cta_text: 'EXPLORE CRICKET',
    route: '/sports/cricket',
  },
  football: {
    name: 'Football',
    tagline: 'STADIUM LIGHTING & BALL TRAJECTORY EXPERIENCE',
    scene_heading: 'OWN THE FIELD.',
    short_description:
      'Master ball control, tactical field vision, passing geometry, and explosive match conditioning under professional coaching.',
    highlights: [
      'Small-sided tactical games & positional drills',
      'Set-piece trajectory & finishing sessions',
    ],
    cta_text: 'EXPLORE FOOTBALL',
    route: '/sports/football',
  },
  basketball: {
    name: 'Basketball',
    tagline: 'ELEVATION, COURT VISION & TEAM TRANSITION',
    scene_heading: 'AIM HIGHER.',
    short_description:
      'Sharpen ball-handling, shooting arc mechanics, defensive footwork, and fast-paced team coordination on court.',
    highlights: [
      'Form shooting & arc trajectory drills',
      'Half-court tactical execution & fast-break transition',
    ],
    cta_text: 'EXPLORE BASKETBALL',
    route: '/sports/basketball',
  },
  chess: {
    name: 'Chess',
    tagline: 'STRATEGIC FORESIGHT & COGNITIVE PRECISION',
    scene_heading: 'THINK AHEAD. PLAY SMART.',
    short_description:
      'Cultivate deep concentration, multi-move calculation, tactical pattern recognition, and calm decision-making under clock pressure.',
    highlights: [
      'Guided classical & rapid tournament preparation',
      'Tactical puzzle labs & grandmaster game studies',
    ],
    cta_text: 'EXPLORE CHESS',
    route: '/sports/chess',
  },
};

function getResponsiveScrollDistance(): number {
  if (typeof window === 'undefined') return 12800;
  const w = window.innerWidth;
  if (w < 640) return 9200;
  if (w < 1024) return 11000;
  return 13200;
}

export const CinematicSportsStage: React.FC<CinematicSportsStageProps> = ({
  reducedMotion,
}) => {
  const { settings, disciplines, navigate } = useCms();

  const rootRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const blackoutRef = useRef<HTMLDivElement | null>(null);
  const heroOverlayRef = useRef<HTMLDivElement | null>(null);
  const scrollHintRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const chapterPillRefs = useRef<Record<ChapterId, HTMLButtonElement | null>>({
    hero: null,
    cricket: null,
    football: null,
    basketball: null,
    chess: null,
  });
  const sportOverlayRefs = useRef<Record<SportStageId, HTMLDivElement | null>>({
    cricket: null,
    football: null,
    basketball: null,
    chess: null,
  });

  const triggerRef = useRef<ScrollTrigger | null>(null);
  const latestEvalRef = useRef<MasterTimelineEvaluation>(
    evaluateMasterTimeline(0)
  );
  const lastGlobalFrameRef = useRef<number>(0);
  const lastDrawnKeyRef = useRef<string>('');
  const cacheRef = useRef<SequenceFrameCache | null>(null);

  const sportCopyMap = useMemo(() => {
    const bySlug = new Map<string, CmsDiscipline>();
    disciplines.forEach((d) => bySlug.set(d.slug.toLowerCase(), d));

    const resolve = (id: SportStageId) => {
      const cms = bySlug.get(id);
      const fallback = DEFAULT_SPORT_COPY[id];
      return {
        name: cms?.name || fallback.name,
        tagline: cms?.tagline || fallback.tagline,
        scene_heading: cms?.scene_heading || fallback.scene_heading,
        short_description: cms?.short_description || fallback.short_description,
        highlights:
          cms?.highlights && cms.highlights.length > 0
            ? cms.highlights.slice(0, 2)
            : fallback.highlights,
        cta_text: cms?.cta_text || fallback.cta_text,
        route: `/sports/${cms?.slug || id}`,
      };
    };

    return {
      cricket: resolve('cricket'),
      football: resolve('football'),
      basketball: resolve('basketball'),
      chess: resolve('chess'),
    };
  }, [disciplines]);

  useEffect(() => {
    if (reducedMotion) return;

    const canvas = canvasRef.current;
    const stageEl = stageRef.current;
    if (!canvas || !stageEl) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let cssW = stageEl.clientWidth || window.innerWidth;
    let cssH = stageEl.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const syncCanvasSize = () => {
      cssW = stageEl.clientWidth || window.innerWidth;
      cssH = stageEl.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      const targetW = Math.max(1, Math.round(cssW * dpr));
      const targetH = Math.max(1, Math.round(cssH * dpr));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        lastDrawnKeyRef.current = '';
      }
    };

    const drawImageOnCanvas = (
      img: HTMLImageElement,
      folder: SequenceFolderId,
      force = false
    ) => {
      const meta = FOLDER_META[folder];
      const drawKey = `${img.src}|${folder}|${cssW}x${cssH}|${dpr}`;
      if (!force && lastDrawnKeyRef.current === drawKey) return;
      lastDrawnKeyRef.current = drawKey;

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill exact sampled scene backdrop so edges blend seamlessly without letterboxing bars
      ctx.fillStyle = meta.backdropColor;
      ctx.fillRect(0, 0, cssW, cssH);

      const iw = img.naturalWidth || 1280;
      const ih = img.naturalHeight || 720;
      const isDesktop = cssW >= 1024;
      const isMobile = cssW < 640;
      const headerH = isMobile ? 72 : 80;
      const railH = isMobile ? 44 : 52;

      if (folder === 1) {
        // Hero Cricket Stadium: full-bleed cinematic cover focused on the central pitch
        const scale = Math.max(cssW / iw, cssH / ih);
        const drawW = iw * scale;
        const drawH = ih * scale;
        const drawX = (cssW - drawW) * 0.5;
        const drawY = (cssH - drawH) * 0.46;
        ctx.drawImage(img, 0, 0, iw, ih, drawX, drawY, drawW, drawH);
      } else if (isDesktop) {
        // Desktop: large uncropped cinema presentation aligned cleanly away from text column
        const padTop = headerH + 6;
        const padBottom = railH + 6;
        const safeW = cssW;
        const safeH = Math.max(240, cssH - padTop - padBottom);
        const scale = Math.min(safeW / iw, safeH / ih);
        const drawW = iw * scale;
        const drawH = ih * scale;

        // Composition-aware horizontal anchoring:
        // Football (folder 4): player on left -> keep anchored slightly left so upper-right stays open
        // Cricket (2,3), Basketball (5), Chess (6): subject on right -> anchor slightly right so left column stays open
        const extraX = Math.max(0, cssW - drawW);
        let drawX = extraX * 0.5;
        if (folder === 4) {
          drawX = Math.min(extraX * 0.25, 36);
        } else {
          drawX = Math.max(extraX * 0.78, extraX - 24);
        }
        const drawY = padTop + (safeH - drawH) * 0.5;
        ctx.drawImage(img, 0, 0, iw, ih, drawX, drawY, drawW, drawH);
      } else {
        // Tablet & Mobile Portrait: dedicated top visual stage with subject-framed crop
        // Guarantees player + ball + chessboard remain large, uncropped, and never behind text
        const availableH = Math.max(300, cssH - headerH - railH);
        const visualRatio = isMobile ? 0.47 : 0.52;
        const zoneTop = headerH + 4;
        const zoneH = Math.round(availableH * visualRatio);
        const zonePadX = isMobile ? 8 : 20;
        const zoneW = Math.max(200, cssW - zonePadX * 2);

        const crop = meta.mobileCrop;
        const sx = Math.round(crop.x * iw);
        const sy = Math.round(crop.y * ih);
        const sw = Math.round(crop.w * iw);
        const sh = Math.round(crop.h * ih);

        const scale = Math.min(zoneW / sw, zoneH / sh);
        const drawW = sw * scale;
        const drawH = sh * scale;
        const drawX = zonePadX + (zoneW - drawW) * 0.5;
        const drawY = zoneTop + (zoneH - drawH) * 0.5;

        ctx.drawImage(img, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
      }

      ctx.restore();
    };

    const applyTimelineState = (
      state: MasterTimelineEvaluation,
      forceCanvas = false
    ) => {
      latestEvalRef.current = state;

      // Determine scroll direction for directional frame preloading
      const direction: 1 | -1 =
        state.globalFrameIndex >= lastGlobalFrameRef.current ? 1 : -1;
      lastGlobalFrameRef.current = state.globalFrameIndex;

      // 1. Preload sliding window around current frame
      const cache = cacheRef.current;
      if (cache) {
        cache.preloadAround(state.globalFrameIndex, direction);
        const sportFrames = SPORT_FRAME_MAP[state.activeSportId];
        const best = cache.getBestAvailableFrame(
          sportFrames,
          state.sportFrameIndex
        );
        if (best) {
          drawImageOnCanvas(best.image, best.matchedFolder, forceCanvas);
        } else {
          // Fill exact backdrop immediately while first frame decodes (never stale cross-sport frame)
          ctx.save();
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.fillStyle = state.folderMeta.backdropColor;
          ctx.fillRect(0, 0, cssW, cssH);
          ctx.restore();
        }
      }

      // 2. Update stage background color to match active folder seamlessly
      stageEl.style.backgroundColor = state.folderMeta.backdropColor;

      // 3. Update Hero overlay (Folder 1)
      if (heroOverlayRef.current) {
        const { opacity, translateY, interactive } = state.heroOverlay;
        heroOverlayRef.current.style.opacity = opacity.toFixed(4);
        heroOverlayRef.current.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
        heroOverlayRef.current.style.pointerEvents = interactive
          ? 'auto'
          : 'none';
        heroOverlayRef.current.style.visibility =
          opacity < 0.005 ? 'hidden' : 'visible';
      }

      // Fade out initial scroll hint cleanly as soon as user starts scrolling
      if (scrollHintRef.current) {
        const hintOpacity = Math.max(0, 1 - state.unit / 34);
        scrollHintRef.current.style.opacity = hintOpacity.toFixed(3);
        scrollHintRef.current.style.visibility =
          hintOpacity < 0.01 ? 'hidden' : 'visible';
      }

      // 4. Update Sport overlays (Cricket, Football, Basketball, Chess)
      (Object.keys(sportOverlayRefs.current) as SportStageId[]).forEach(
        (sportId) => {
          const el = sportOverlayRefs.current[sportId];
          if (!el) return;
          const ov = state.sportOverlays[sportId];
          el.style.opacity = ov.opacity.toFixed(4);
          el.style.transform = `translate3d(0, ${ov.translateY.toFixed(1)}px, 0)`;
          el.style.pointerEvents = ov.interactive ? 'auto' : 'none';
          el.style.visibility = ov.opacity < 0.005 ? 'hidden' : 'visible';
        }
      );

      // 5. Update universal smooth blackout curtain (strictly 0 inside Hero + Cricket 2 + Cricket 3)
      if (blackoutRef.current) {
        blackoutRef.current.style.opacity = state.blackoutOpacity.toFixed(4);
        blackoutRef.current.style.visibility =
          state.blackoutOpacity < 0.002 ? 'hidden' : 'visible';
      }

      // 6. Update bottom chapter progress rail & theme contrast
      if (railRef.current) {
        railRef.current.dataset.theme = state.folderMeta.theme;
      }
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${state.progress.toFixed(4)})`;
      }
      (Object.keys(chapterPillRefs.current) as ChapterId[]).forEach((chId) => {
        const btn = chapterPillRefs.current[chId];
        if (!btn) return;
        btn.dataset.active = state.activeChapterId === chId ? 'true' : 'false';
      });
    };

    // Initialize frame cache & immediate Hero Frame 1 load
    const frameCache = new SequenceFrameCache((decodedUrl) => {
      const current = latestEvalRef.current;
      // Redraw immediately when the exact target frame (or any frame in the active sport while waiting) arrives
      if (current.frame.url === decodedUrl) {
        const sportFrames = SPORT_FRAME_MAP[current.activeSportId];
        const best = frameCache.getBestAvailableFrame(
          sportFrames,
          current.sportFrameIndex
        );
        if (best) {
          drawImageOnCanvas(best.image, best.matchedFolder, true);
        }
      }
    });
    cacheRef.current = frameCache;

    syncCanvasSize();
    frameCache.preloadInitial();
    applyTimelineState(evaluateMasterTimeline(0), true);

    // ResizeObserver keeps canvas sharp across orientation changes & browser resizing
    const resizeObserver = new ResizeObserver(() => {
      syncCanvasSize();
      applyTimelineState(latestEvalRef.current, true);
    });
    resizeObserver.observe(stageEl);

    // Single GSAP ScrollTrigger controlling the entire pinned cinema sequence
    const gsapCtx = gsap.context(() => {
      triggerRef.current = ScrollTrigger.create({
        trigger: rootRef.current,
        pin: stageEl,
        start: 'top top',
        end: () => `+=${getResponsiveScrollDistance()}`,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          applyTimelineState(evaluateMasterTimeline(self.progress));
        },
        onRefresh: (self) => {
          syncCanvasSize();
          applyTimelineState(evaluateMasterTimeline(self.progress), true);
        },
      });
    }, rootRef);

    // Ensure accurate sync after initial paint or browser scroll restoration
    const rafRefresh = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      window.cancelAnimationFrame(rafRefresh);
      resizeObserver.disconnect();
      gsapCtx.revert();
      triggerRef.current = null;
      frameCache.dispose();
      cacheRef.current = null;
    };
  }, [reducedMotion]);

  const handleJumpToChapter = (chapter: ChapterId) => {
    const st = triggerRef.current;
    if (!st) return;
    const targetProgress = CHAPTER_PROGRESS_ANCHORS[chapter];
    const targetY = st.start + (st.end - st.start) * targetProgress;
    scrollEngine.scrollTo(targetY, 0);
  };

  // Reduced-motion accessible static presentation
  if (reducedMotion) {
    return (
      <section
        id="home"
        aria-label="Inventive Sports Academy — Featured Disciplines"
        className="relative w-full pt-20 bg-[#FFFFFF] border-b border-[#E7E7E7]"
      >
        <div className="relative w-full min-h-[75vh] flex items-center bg-[#070C14] overflow-hidden">
          <img
            src={heroStadiumFrames[0].url}
            alt="Inventive Sports Cricket Stadium under night floodlights"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05080F]/90 via-[#05080F]/65 to-[#05080F]/25" />
          <div className="relative z-10 max-w-[1440px] mx-auto w-full px-4 sm:px-8 lg:px-12 py-16">
            <span className="inline-flex items-center gap-2.5 px-3 py-1 bg-[#FFFFFF]/12 border border-[#FFFFFF]/25 font-mono-label text-[10px] sm:text-[11px] text-[#FFFFFF] mb-4">
              <span className="w-2 h-2 rounded-full bg-[#D71920]" />
              INVENTIVE SPORTS &amp; PERFORMING ARTS
            </span>
            <h1 className="heading-hero text-[#FFFFFF] uppercase max-w-3xl">
              <span className="block">BUILD SKILLS.</span>
              <span className="block">DISCOVER POTENTIAL.</span>
              <span className="block text-[#D71920]">BECOME EXTRAORDINARY.</span>
            </h1>
            <p className="mt-5 body-lead text-[#FFFFFF]/85 max-w-xl">
              {settings.hero_subcopy}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <a
                href="#disciplines"
                onClick={(e) => {
                  e.preventDefault();
                  scrollEngine.scrollTo('#disciplines', -72);
                }}
                className="inline-flex items-center gap-3 bg-[#D71920] text-[#FFFFFF] font-mono-label text-xs px-6 py-4 hover:bg-[#151515] transition-colors"
              >
                <span>{settings.hero_primary_cta || 'EXPLORE DISCIPLINES'}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/about');
                }}
                className="inline-flex items-center gap-3 bg-[#FFFFFF] text-[#151515] font-mono-label text-xs px-6 py-4 hover:bg-[#D71920] hover:text-[#FFFFFF] transition-colors"
              >
                <span>
                  {settings.hero_secondary_cta || 'DISCOVER OUR ACADEMY'}
                </span>
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-14 grid grid-cols-1 md:grid-cols-2 gap-8">
          {SPORT_SEQUENCES.map((sport) => {
            const copy = sportCopyMap[sport.id];
            const previewFrame =
              sport.id === 'cricket'
                ? sport.frames[238]?.url || sport.frames[0].url
                : sport.frames[Math.floor(sport.frames.length * 0.5)]?.url ||
                  sport.frames[0].url;
            return (
              <article
                key={sport.id}
                className="border border-[#E7E7E7] bg-[#FFFFFF] overflow-hidden flex flex-col"
              >
                <div className="aspect-[16/9] w-full bg-[#F5F5F5] overflow-hidden">
                  <img
                    src={previewFrame}
                    alt={`${copy.name} at Inventive Sports Academy`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1 justify-between space-y-4">
                  <div>
                    <span className="font-tech-code text-[11px] font-semibold text-[#D71920]">
                      {sport.orderLabel} // {copy.name.toUpperCase()}
                    </span>
                    <h2 className="heading-card text-[#151515] uppercase mt-1">
                      {copy.scene_heading}
                    </h2>
                    <p className="text-sm text-[#626262] mt-2">
                      {copy.short_description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <a
                      href={copy.route}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(copy.route);
                      }}
                      className="inline-flex items-center gap-2 bg-[#D71920] text-[#FFFFFF] font-mono-label text-xs px-5 py-3 hover:bg-[#151515] transition-colors"
                    >
                      <span>{copy.cta_text}</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section
      id="home"
      ref={rootRef}
      aria-label="Inventive Sports Academy — Cinematic Sports Experience"
      className="relative w-full bg-[#070C14] overflow-x-clip"
    >
      {/* SINGLE PINNED CINEMATIC STAGE (100dvh, ScrollTrigger-driven) */}
      <div
        ref={stageRef}
        className="relative w-full h-[100dvh] min-h-[580px] overflow-hidden bg-[#070C14]"
      >
        {/* LAYER 1: High-DPI HTML5 Sequence Canvas */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full block"
        />

        {/* LAYER 2: HERO STADIUM OVERLAY (Folder 1 — Visible on Initial Load, Fades Out Before Folder 2) */}
        <div
          ref={heroOverlayRef}
          className="absolute inset-0 z-10 flex items-end sm:items-center pt-[76px] sm:pt-[84px] pb-[56px] sm:pb-[64px] will-change-[opacity,transform]"
        >
          {/* Responsive Scrim: keeps illuminated cricket pitch dramatic while ensuring razor-sharp legibility */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#05080F]/94 via-[#05080F]/58 to-[#05080F]/28 lg:bg-gradient-to-r lg:from-[#05080F]/86 lg:via-[#05080F]/52 lg:to-transparent"
          />

          <div className="relative z-10 max-w-[1440px] mx-auto w-full px-4 sm:px-8 lg:px-12">
            <div className="max-w-xl lg:max-w-2xl">
              <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-[#FFFFFF]/12 backdrop-blur-xs border border-[#FFFFFF]/25 font-mono-label text-[10px] sm:text-[11px] text-[#FFFFFF] mb-3.5 sm:mb-5">
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full bg-[#D71920]"
                />
                <span>INVENTIVE SPORTS &amp; PERFORMING ARTS</span>
              </div>

              <h1 className="font-display font-extrabold text-[#FFFFFF] uppercase tracking-[-0.035em] leading-[1.02] text-[clamp(1.95rem,7.8vw,2.65rem)] sm:text-[clamp(2.75rem,5.4vw,4.9rem)] drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)]">
                <span className="block">BUILD SKILLS.</span>
                <span className="block">DISCOVER POTENTIAL.</span>
                <span className="block text-[#FF2A32]">
                  BECOME EXTRAORDINARY.
                </span>
              </h1>

              <p className="mt-3 sm:mt-5 text-[13.5px] sm:text-base lg:text-lg text-[#FFFFFF]/88 leading-relaxed max-w-xl">
                {settings.hero_subcopy ||
                  'Where sports, strategy, and performing arts come together to shape confident individuals and future champions.'}
              </p>

              <div className="mt-5 sm:mt-7 flex flex-col xs:flex-row sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-4">
                <a
                  href="#disciplines"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollEngine.scrollTo('#disciplines', -72);
                  }}
                  className="inline-flex items-center justify-center gap-2.5 bg-[#D71920] text-[#FFFFFF] font-mono-label text-[11px] sm:text-xs px-5 sm:px-6 min-h-[44px] sm:min-h-[48px] hover:bg-[#FFFFFF] hover:text-[#151515] transition-colors duration-200 group"
                >
                  <span>
                    {settings.hero_primary_cta || 'EXPLORE DISCIPLINES'}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                  />
                </a>

                <a
                  href="/about"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/about');
                  }}
                  className="inline-flex items-center justify-center gap-2.5 bg-[#FFFFFF]/12 backdrop-blur-xs text-[#FFFFFF] border border-[#FFFFFF]/45 font-mono-label text-[11px] sm:text-xs px-5 sm:px-6 min-h-[44px] sm:min-h-[48px] hover:bg-[#FFFFFF] hover:text-[#151515] hover:border-[#FFFFFF] transition-colors duration-200"
                >
                  <span>
                    {settings.hero_secondary_cta || 'DISCOVER OUR ACADEMY'}
                  </span>
                </a>
              </div>

              {/* Three Academy Pillars Strip — visible on sm+ to keep mobile clean & uncluttered */}
              <div className="hidden sm:grid mt-7 lg:mt-8 pt-4 border-t border-[#FFFFFF]/20 grid-cols-3 gap-4 max-w-xl">
                <div>
                  <span className="font-tech-code text-[10px] text-[#FF3B42] font-semibold">
                    01 // SPORTS
                  </span>
                  <span className="block font-mono-label text-[10px] text-[#FFFFFF]/88 mt-1">
                    CRICKET, FOOTBALL, BASKETBALL &amp; MORE
                  </span>
                </div>
                <div>
                  <span className="font-tech-code text-[10px] text-[#FF3B42] font-semibold">
                    02 // STRATEGY
                  </span>
                  <span className="block font-mono-label text-[10px] text-[#FFFFFF]/88 mt-1">
                    CLASSICAL &amp; RAPID TOURNAMENT CHESS
                  </span>
                </div>
                <div>
                  <span className="font-tech-code text-[10px] text-[#FF3B42] font-semibold">
                    03 // ARTS
                  </span>
                  <span className="block font-mono-label text-[10px] text-[#FFFFFF]/88 mt-1">
                    DANCE, MOVEMENT &amp; STAGE SHOWCASES
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Initial Scroll Cue */}
          <div
            ref={scrollHintRef}
            aria-hidden="true"
            className="hidden sm:flex absolute right-8 lg:right-12 bottom-[70px] items-center gap-2.5 px-3.5 py-2 bg-[#05080F]/65 backdrop-blur-xs border border-[#FFFFFF]/25 text-[#FFFFFF]"
          >
            <span className="font-mono-label text-[10px] tracking-[0.16em]">
              SCROLL TO BEGIN
            </span>
            <ArrowDown className="w-3.5 h-3.5 text-[#FF3B42]" />
          </div>
        </div>

        {/* LAYER 3: SYNCHRONIZED SPORT CONTENT OVERLAYS (Cricket, Football, Basketball, Chess) */}
        {SPORT_SEQUENCES.map((sport) => {
          const copy = sportCopyMap[sport.id];
          const isFootball = sport.id === 'football';

          // Desktop positioning tailored directly to each folder's actual frame composition
          const desktopPosClass =
            sport.desktopAlignment === 'right-top'
              ? 'lg:left-auto lg:right-[4.5%] xl:right-[6%] lg:top-[14%] lg:bottom-auto lg:translate-y-0'
              : sport.desktopAlignment === 'left-bottom'
                ? 'lg:left-[4.5%] xl:left-[6%] lg:right-auto lg:top-auto lg:bottom-[15%] lg:translate-y-0'
                : 'lg:left-[4.5%] xl:left-[6%] lg:right-auto lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2';

          const mobileBackdropGrad = isFootball
            ? 'bg-gradient-to-t from-[#ECECEC] via-[#ECECEC]/96 to-[#ECECEC]/0 lg:bg-none'
            : 'bg-gradient-to-t from-[#FFFFFF] via-[#FFFFFF]/96 to-[#FFFFFF]/0 lg:bg-none';

          return (
            <div
              key={sport.id}
              ref={(el) => {
                sportOverlayRefs.current[sport.id] = el;
              }}
              style={{ opacity: 0, visibility: 'hidden' }}
              className={`absolute inset-x-0 bottom-[44px] sm:bottom-[52px] z-10 px-4 sm:px-8 pt-6 pb-3 sm:pb-5 lg:inset-x-auto lg:p-0 lg:w-[410px] xl:w-[450px] will-change-[opacity,transform] ${mobileBackdropGrad} ${desktopPosClass}`}
            >
              <div className="max-w-xl mx-auto lg:max-w-none lg:mx-0">
                {/* Sport Eyebrow & Counter */}
                <div className="flex items-center gap-2.5 mb-1.5 sm:mb-2.5">
                  <span className="font-display font-extrabold text-lg sm:text-2xl lg:text-3xl text-[#D71920] leading-none">
                    {sport.orderLabel}
                  </span>
                  <span
                    aria-hidden="true"
                    className="w-5 sm:w-7 h-[2px] bg-[#151515]"
                  />
                  <span className="font-tech-code text-[10px] sm:text-[11px] font-semibold text-[#D71920]">
                    {copy.name.toUpperCase()}
                  </span>
                </div>

                {/* Subtitle / Tagline */}
                <p className="font-mono-label text-[9.5px] sm:text-[10.5px] text-[#595959] mb-1 sm:mb-2 line-clamp-1">
                  {copy.tagline}
                </p>

                {/* Fluid Sport Heading */}
                <h2 className="font-display font-extrabold text-[#151515] uppercase tracking-[-0.03em] leading-[1.04] text-[clamp(1.5rem,6.5vw,2.1rem)] sm:text-[clamp(2rem,4vw,2.65rem)] lg:text-[clamp(2.25rem,3.1vw,3.3rem)]">
                  {copy.scene_heading}
                </h2>

                {/* Readable Description */}
                <p className="mt-2 sm:mt-3 text-[12.5px] sm:text-sm lg:text-[15px] text-[#4A4A4A] leading-snug sm:leading-relaxed line-clamp-3 sm:line-clamp-none">
                  {copy.short_description}
                </p>

                {/* Training Highlights — Desktop & Large Tablet only so mobile stays spacious */}
                <div className="hidden lg:flex flex-wrap gap-1.5 mt-4">
                  {copy.highlights.map((hl) => (
                    <span
                      key={hl}
                      className="px-2.5 py-1 text-[10px] font-tech-code border border-[#151515]/15 bg-[#FFFFFF]/85 text-[#151515]"
                    >
                      {hl}
                    </span>
                  ))}
                </div>

                {/* Responsive Tappable CTA Buttons */}
                <div className="mt-3.5 sm:mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <a
                    href={copy.route}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(copy.route);
                    }}
                    className="inline-flex items-center justify-center gap-2.5 bg-[#D71920] text-[#FFFFFF] font-mono-label text-[11px] sm:text-xs px-4 sm:px-6 min-h-[44px] hover:bg-[#151515] transition-colors duration-200 group"
                  >
                    <span>{copy.cta_text}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-1"
                    />
                  </a>

                  <a
                    href="/contact"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/contact');
                    }}
                    className="inline-flex items-center justify-center gap-2 bg-[#FFFFFF]/90 text-[#151515] border border-[#151515] font-mono-label text-[11px] sm:text-xs px-4 sm:px-5 min-h-[44px] hover:border-[#D71920] hover:text-[#D71920] transition-colors duration-200"
                  >
                    <span>BOOK TRIAL</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {/* LAYER 4: BOTTOM CHAPTER NAVIGATION & SCROLL PROGRESS RAIL */}
        <div
          ref={railRef}
          data-theme="dark"
          className="group/rail absolute inset-x-0 bottom-0 z-20 h-[44px] sm:h-[52px] border-t transition-colors duration-300 data-[theme=dark]:bg-[#05080F]/78 data-[theme=dark]:border-[#FFFFFF]/15 data-[theme=light]:bg-[#FFFFFF]/88 data-[theme=light]:border-[#E5E5E5] backdrop-blur-xs"
        >
          {/* Master Sequence Progress Hairline */}
          <div
            aria-hidden="true"
            className="w-full h-[2px] group-data-[theme=dark]/rail:bg-[#FFFFFF]/15 group-data-[theme=light]/rail:bg-[#E5E5E5] overflow-hidden"
          >
            <div
              ref={progressFillRef}
              className="h-full w-full bg-[#D71920] origin-left"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>

          <div className="max-w-[1440px] mx-auto h-[calc(100%-2px)] px-3 sm:px-8 lg:px-12 flex items-center justify-between gap-2">
            <div
              role="navigation"
              aria-label="Cinematic sport chapters"
              className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1"
            >
              {CHAPTER_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  ref={(el) => {
                    chapterPillRefs.current[pill.id] = el;
                  }}
                  data-active={pill.id === 'hero' ? 'true' : 'false'}
                  onClick={() => handleJumpToChapter(pill.id)}
                  className="px-2 sm:px-3 py-1 text-[9.5px] sm:text-[10px] font-mono-label whitespace-nowrap border transition-colors cursor-pointer shrink-0 group-data-[theme=dark]/rail:border-[#FFFFFF]/20 group-data-[theme=dark]/rail:text-[#FFFFFF]/75 group-data-[theme=dark]/rail:hover:border-[#FFFFFF] group-data-[theme=dark]/rail:data-[active=true]:bg-[#D71920] group-data-[theme=dark]/rail:data-[active=true]:border-[#D71920] group-data-[theme=dark]/rail:data-[active=true]:text-[#FFFFFF] group-data-[theme=light]/rail:border-[#E5E5E5] group-data-[theme=light]/rail:text-[#595959] group-data-[theme=light]/rail:hover:border-[#151515] group-data-[theme=light]/rail:data-[active=true]:bg-[#151515] group-data-[theme=light]/rail:data-[active=true]:border-[#151515] group-data-[theme=light]/rail:data-[active=true]:text-[#FFFFFF]"
                >
                  <span className="hidden md:inline">{pill.label}</span>
                  <span className="md:hidden">{pill.shortLabel}</span>
                </button>
              ))}
            </div>

            <span className="hidden lg:inline-flex items-center gap-2 font-tech-code text-[10px] group-data-[theme=dark]/rail:text-[#FFFFFF]/65 group-data-[theme=light]/rail:text-[#595959] shrink-0">
              SCROLL TO SCRUB SEQUENCE
            </span>
          </div>
        </div>

        {/* LAYER 5: UNIVERSAL SMOOTH BLACKOUT CURTAIN (Active ONLY Between Completed Sports) */}
        <div
          ref={blackoutRef}
          aria-hidden="true"
          style={{ opacity: 0, visibility: 'hidden' }}
          className="absolute inset-0 z-30 bg-[#000000] pointer-events-none will-change-[opacity]"
        />
      </div>
    </section>
  );
};
