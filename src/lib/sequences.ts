import { clamp, easeInOutCubic, easeOutCubic, invLerp } from './math';
import { assetUrl } from './assets';

export type SportStageId = 'cricket' | 'football' | 'basketball' | 'chess';
export type ChapterId = 'hero' | SportStageId;
export type SequenceFolderId = 1 | 2 | 3 | 4 | 5 | 6;

export interface FrameEntry {
  url: string;
  folder: SequenceFolderId;
  folderFrame: number; // 1-based numeric frame index inside its source folder
}

/**
 * Generates numerically sorted frame paths without modifying original filenames.
 */
function buildNumericSequence(
  folder: SequenceFolderId,
  count: number
): FrameEntry[] {
  const frames: FrameEntry[] = [];
  for (let i = 1; i <= count; i += 1) {
    const num = String(i).padStart(3, '0');
    frames.push({
      url: assetUrl(`/sequences/${folder}/ezgif-frame-${num}.jpg`),
      folder,
      folderFrame: i,
    });
  }
  return frames;
}

// Verified frame counts from extracted source archives (all 1280x720)
export const heroStadiumFrames: FrameEntry[] = buildNumericSequence(1, 238);
export const cricketFolder2Frames: FrameEntry[] = buildNumericSequence(2, 120);
export const cricketFolder3Frames: FrameEntry[] = buildNumericSequence(3, 226);

/**
 * Complete uninterrupted Cricket experience:
 * Hero Stadium (238) + Cricket Folder 2 Bowler (120) + Cricket Folder 3 Batter (226) = 584 frames.
 * Zero blackouts or restarts between any of these three folders.
 */
export const completeCricketFrames: FrameEntry[] = [
  ...heroStadiumFrames,
  ...cricketFolder2Frames,
  ...cricketFolder3Frames,
];

export const footballFrames: FrameEntry[] = buildNumericSequence(4, 240);
export const basketballFrames: FrameEntry[] = buildNumericSequence(5, 240);
export const chessFrames: FrameEntry[] = buildNumericSequence(6, 240);

export interface NormalizedCropBox {
  /** Normalized 0..1 source rectangle to frame subject cleanly on mobile viewports */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FolderRenderMeta {
  backdropColor: string;
  renderMode: 'cover' | 'contain';
  theme: 'dark' | 'light';
  /** Mobile portrait visual crop box preserving player + ball / subject with zero cropping */
  mobileCrop: NormalizedCropBox;
}

/**
 * Per-folder visual metadata derived from direct inspection of all 6 animation folders.
 */
export const FOLDER_META: Record<SequenceFolderId, FolderRenderMeta> = {
  1: {
    backdropColor: '#070C14',
    renderMode: 'cover',
    theme: 'dark',
    mobileCrop: { x: 0.08, y: 0, w: 0.84, h: 1 },
  },
  2: {
    // Cricket Bowler — right half on pure #FDFDFD white
    backdropColor: '#FDFDFD',
    renderMode: 'contain',
    theme: 'light',
    mobileCrop: { x: 0.44, y: 0.02, w: 0.54, h: 0.96 },
  },
  3: {
    // Cricket Batter + ball flying left-mid on pure #FFFFFF white
    backdropColor: '#FFFFFF',
    renderMode: 'contain',
    theme: 'light',
    mobileCrop: { x: 0.12, y: 0.02, w: 0.86, h: 0.96 },
  },
  4: {
    // Footballer on left blasting ball to lower-right on #ECECEC studio backdrop
    backdropColor: '#ECECEC',
    renderMode: 'contain',
    theme: 'light',
    mobileCrop: { x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
  },
  5: {
    // Basketball player on right shooting high up-left on pure #FFFFFF white
    backdropColor: '#FFFFFF',
    renderMode: 'contain',
    theme: 'light',
    mobileCrop: { x: 0.04, y: 0.02, w: 0.94, h: 0.96 },
  },
  6: {
    // Chess — pure #FFFFFF left half, basketball->knight morph & marble board on right half
    backdropColor: '#FFFFFF',
    renderMode: 'contain',
    theme: 'light',
    mobileCrop: { x: 0.45, y: 0, w: 0.55, h: 1 },
  },
};

export interface SportSequenceConfig {
  id: SportStageId;
  slug: string;
  orderLabel: string;
  label: string;
  desktopAlignment: 'left' | 'right-top' | 'left-bottom';
  frames: FrameEntry[];
}

export const SPORT_SEQUENCES: SportSequenceConfig[] = [
  {
    id: 'cricket',
    slug: 'cricket',
    orderLabel: '01',
    label: 'Cricket',
    desktopAlignment: 'left',
    frames: completeCricketFrames,
  },
  {
    id: 'football',
    slug: 'football',
    orderLabel: '02',
    label: 'Football',
    desktopAlignment: 'right-top',
    frames: footballFrames,
  },
  {
    id: 'basketball',
    slug: 'basketball',
    orderLabel: '03',
    label: 'Basketball',
    desktopAlignment: 'left-bottom',
    frames: basketballFrames,
  },
  {
    id: 'chess',
    slug: 'chess',
    orderLabel: '04',
    label: 'Chess',
    desktopAlignment: 'left',
    frames: chessFrames,
  },
];

export const SPORT_FRAME_MAP: Record<SportStageId, FrameEntry[]> = {
  cricket: completeCricketFrames,
  football: footballFrames,
  basketball: basketballFrames,
  chess: chessFrames,
};

export const ALL_MASTER_FRAMES: FrameEntry[] = [
  ...completeCricketFrames,
  ...footballFrames,
  ...basketballFrames,
  ...chessFrames,
];

export const SPORT_GLOBAL_OFFSETS: Record<SportStageId, number> = {
  cricket: 0,
  football: completeCricketFrames.length,
  basketball: completeCricketFrames.length + footballFrames.length,
  chess:
    completeCricketFrames.length +
    footballFrames.length +
    basketballFrames.length,
};

/**
 * Anchor frames (first & last frame of every folder) kept permanently warm in cache
 * so boundaries and fast scrollbar jumps never flash blank.
 */
export const PRIORITY_ANCHOR_URLS: string[] = [
  heroStadiumFrames[0].url,
  heroStadiumFrames[heroStadiumFrames.length - 1].url,
  cricketFolder2Frames[0].url,
  cricketFolder2Frames[cricketFolder2Frames.length - 1].url,
  cricketFolder3Frames[0].url,
  cricketFolder3Frames[cricketFolder3Frames.length - 1].url,
  footballFrames[0].url,
  footballFrames[footballFrames.length - 1].url,
  basketballFrames[0].url,
  basketballFrames[basketballFrames.length - 1].url,
  chessFrames[0].url,
  chessFrames[chessFrames.length - 1].url,
];

// ============================================================================
// MASTER TIMELINE SEGMENTS (Deterministic scroll-derived choreography)
// ============================================================================
const HERO_LEN = heroStadiumFrames.length; // 238
const CRICKET_2_LEN = cricketFolder2Frames.length; // 120
const CRICKET_3_LEN = cricketFolder3Frames.length; // 226
const CRICKET_TOTAL_LEN = HERO_LEN + CRICKET_2_LEN + CRICKET_3_LEN; // 584

const BLACKOUT_FADE_IN = 18;
const BLACKOUT_HOLD = 10;
const BLACKOUT_FADE_OUT = 18;
const BLACKOUT_LEN = BLACKOUT_FADE_IN + BLACKOUT_HOLD + BLACKOUT_FADE_OUT; // 46

const FOOTBALL_LEN = footballFrames.length; // 240
const BASKETBALL_LEN = basketballFrames.length; // 240
const CHESS_LEN = chessFrames.length; // 240

// Timeline unit boundaries
const U_HERO_END = HERO_LEN; // 238
const U_CRICKET_2_START = U_HERO_END; // 238
const U_CRICKET_3_START = U_CRICKET_2_START + CRICKET_2_LEN; // 358
const U_CRICKET_END = CRICKET_TOTAL_LEN; // 584

const U_BO1_START = U_CRICKET_END; // 584
const U_BO1_END = U_BO1_START + BLACKOUT_LEN; // 630

const U_FOOTBALL_START = U_BO1_END; // 630
const U_FOOTBALL_END = U_FOOTBALL_START + FOOTBALL_LEN; // 870

const U_BO2_START = U_FOOTBALL_END; // 870
const U_BO2_END = U_BO2_START + BLACKOUT_LEN; // 916

const U_BASKETBALL_START = U_BO2_END; // 916
const U_BASKETBALL_END = U_BASKETBALL_START + BASKETBALL_LEN; // 1156

const U_BO3_START = U_BASKETBALL_END; // 1156
const U_BO3_END = U_BO3_START + BLACKOUT_LEN; // 1202

const U_CHESS_START = U_BO3_END; // 1202
const U_CHESS_END = U_CHESS_START + CHESS_LEN; // 1442

export const MASTER_TIMELINE_UNITS = U_CHESS_END; // 1442

/** Normalized 0..1 progress jump targets for each chapter pill */
export const CHAPTER_PROGRESS_ANCHORS: Record<ChapterId, number> = {
  hero: 0,
  cricket: (U_CRICKET_2_START + 22) / MASTER_TIMELINE_UNITS,
  football: (U_FOOTBALL_START + 24) / MASTER_TIMELINE_UNITS,
  basketball: (U_BASKETBALL_START + 24) / MASTER_TIMELINE_UNITS,
  chess: (U_CHESS_START + 36) / MASTER_TIMELINE_UNITS,
};

export interface OverlayVisualState {
  opacity: number;
  translateY: number;
  interactive: boolean;
}

export interface MasterTimelineEvaluation {
  progress: number;
  unit: number;
  activeSportId: SportStageId;
  activeChapterId: ChapterId;
  sportFrameIndex: number;
  globalFrameIndex: number;
  frame: FrameEntry;
  folderMeta: FolderRenderMeta;
  blackoutOpacity: number;
  heroOverlay: OverlayVisualState;
  sportOverlays: Record<SportStageId, OverlayVisualState>;
  isInBlackout: boolean;
}

function emptyOverlay(): OverlayVisualState {
  return { opacity: 0, translateY: 18, interactive: false };
}

function evaluateBlackoutWindow(
  u: number,
  start: number
): { opacity: number; switchedToNext: boolean } {
  const local = u - start;
  const holdStart = BLACKOUT_FADE_IN;
  const holdMid = BLACKOUT_FADE_IN + BLACKOUT_HOLD * 0.5;
  const holdEnd = BLACKOUT_FADE_IN + BLACKOUT_HOLD;

  if (local <= holdStart) {
    return {
      opacity: easeInOutCubic(invLerp(0, holdStart, local)),
      switchedToNext: false,
    };
  }
  if (local <= holdEnd) {
    return {
      opacity: 1,
      switchedToNext: local >= holdMid,
    };
  }
  return {
    opacity: 1 - easeInOutCubic(invLerp(holdEnd, BLACKOUT_LEN, local)),
    switchedToNext: true,
  };
}

function makeFadeInOutOverlay(
  u: number,
  fadeInStart: number,
  fadeInEnd: number,
  fadeOutStart: number | null,
  fadeOutEnd: number | null
): OverlayVisualState {
  if (u < fadeInStart) {
    return { opacity: 0, translateY: 22, interactive: false };
  }
  if (u <= fadeInEnd) {
    const t = easeOutCubic(invLerp(fadeInStart, fadeInEnd, u));
    return {
      opacity: t,
      translateY: (1 - t) * 22,
      interactive: t > 0.35,
    };
  }
  if (fadeOutStart !== null && fadeOutEnd !== null && u >= fadeOutStart) {
    if (u >= fadeOutEnd) {
      return { opacity: 0, translateY: -18, interactive: false };
    }
    const t = easeInOutCubic(invLerp(fadeOutStart, fadeOutEnd, u));
    return {
      opacity: 1 - t,
      translateY: -18 * t,
      interactive: 1 - t > 0.35,
    };
  }
  return { opacity: 1, translateY: 0, interactive: true };
}

/**
 * Pure deterministic scroll-to-scene evaluator.
 * Forward and reverse scrolling both evaluate the exact same mathematical curve.
 */
export function evaluateMasterTimeline(
  rawProgress: number
): MasterTimelineEvaluation {
  const progress = clamp(rawProgress, 0, 1);
  const u = progress * MASTER_TIMELINE_UNITS;

  let activeSportId: SportStageId = 'cricket';
  let activeChapterId: ChapterId = 'hero';
  let sportFrameIndex = 0;
  let blackoutOpacity = 0;
  let isInBlackout = false;

  if (u < U_CRICKET_END) {
    // Continuous Cricket Experience: Hero (0..237) -> Folder 2 (238..357) -> Folder 3 (358..583)
    activeSportId = 'cricket';
    activeChapterId = u < U_HERO_END ? 'hero' : 'cricket';
    sportFrameIndex = clamp(
      Math.floor((u / U_CRICKET_END) * completeCricketFrames.length),
      0,
      completeCricketFrames.length - 1
    );
    blackoutOpacity = 0; // Strictly zero blackout across all 3 cricket folders
  } else if (u < U_BO1_END) {
    // Transition 1: Cricket -> Football
    const bo = evaluateBlackoutWindow(u, U_BO1_START);
    blackoutOpacity = bo.opacity;
    isInBlackout = true;
    if (!bo.switchedToNext) {
      activeSportId = 'cricket';
      activeChapterId = 'cricket';
      sportFrameIndex = completeCricketFrames.length - 1;
    } else {
      activeSportId = 'football';
      activeChapterId = 'football';
      sportFrameIndex = 0;
    }
  } else if (u < U_FOOTBALL_END) {
    // Sport 2: Football (240 frames)
    activeSportId = 'football';
    activeChapterId = 'football';
    const localT = (u - U_FOOTBALL_START) / FOOTBALL_LEN;
    sportFrameIndex = clamp(
      Math.floor(localT * footballFrames.length),
      0,
      footballFrames.length - 1
    );
  } else if (u < U_BO2_END) {
    // Transition 2: Football -> Basketball
    const bo = evaluateBlackoutWindow(u, U_BO2_START);
    blackoutOpacity = bo.opacity;
    isInBlackout = true;
    if (!bo.switchedToNext) {
      activeSportId = 'football';
      activeChapterId = 'football';
      sportFrameIndex = footballFrames.length - 1;
    } else {
      activeSportId = 'basketball';
      activeChapterId = 'basketball';
      sportFrameIndex = 0;
    }
  } else if (u < U_BASKETBALL_END) {
    // Sport 3: Basketball (240 frames)
    activeSportId = 'basketball';
    activeChapterId = 'basketball';
    const localT = (u - U_BASKETBALL_START) / BASKETBALL_LEN;
    sportFrameIndex = clamp(
      Math.floor(localT * basketballFrames.length),
      0,
      basketballFrames.length - 1
    );
  } else if (u < U_BO3_END) {
    // Transition 3: Basketball -> Chess
    const bo = evaluateBlackoutWindow(u, U_BO3_START);
    blackoutOpacity = bo.opacity;
    isInBlackout = true;
    if (!bo.switchedToNext) {
      activeSportId = 'basketball';
      activeChapterId = 'basketball';
      sportFrameIndex = basketballFrames.length - 1;
    } else {
      activeSportId = 'chess';
      activeChapterId = 'chess';
      sportFrameIndex = 0;
    }
  } else {
    // Sport 4: Chess (240 frames)
    activeSportId = 'chess';
    activeChapterId = 'chess';
    const localT = (u - U_CHESS_START) / CHESS_LEN;
    sportFrameIndex = clamp(
      Math.floor(localT * chessFrames.length),
      0,
      chessFrames.length - 1
    );
  }

  // Hero overlay: visible at initial load (u = 0), fades out cleanly before Hero finishes
  let heroOverlay: OverlayVisualState = emptyOverlay();
  if (u <= U_HERO_END) {
    if (u <= 145) {
      heroOverlay = { opacity: 1, translateY: 0, interactive: true };
    } else if (u <= 220) {
      const t = easeInOutCubic(invLerp(145, 220, u));
      heroOverlay = {
        opacity: 1 - t,
        translateY: -22 * t,
        interactive: 1 - t > 0.35,
      };
    } else {
      heroOverlay = { opacity: 0, translateY: -22, interactive: false };
    }
  }

  // Synchronized sport content overlays (fade in after blackout / Folder 2 start, fade out before sport ends)
  const sportOverlays: Record<SportStageId, OverlayVisualState> = {
    cricket: makeFadeInOutOverlay(
      u,
      U_CRICKET_2_START + 2,
      U_CRICKET_2_START + 30,
      U_CRICKET_3_START + 154, // Starts fading near end of Folder 3 (~68% of Folder 3)
      U_CRICKET_END - 22 // Fully faded out 22 frames before final Cricket frame & blackout
    ),
    football: makeFadeInOutOverlay(
      u,
      U_FOOTBALL_START - 2,
      U_FOOTBALL_START + 26,
      U_FOOTBALL_END - 62,
      U_FOOTBALL_END - 20 // Fully faded out before final Football frames & blackout
    ),
    basketball: makeFadeInOutOverlay(
      u,
      U_BASKETBALL_START - 2,
      U_BASKETBALL_START + 26,
      U_BASKETBALL_END - 66,
      U_BASKETBALL_END - 24 // Fully faded out before ball arcs upper-left & blackout
    ),
    chess: makeFadeInOutOverlay(
      u,
      U_CHESS_START + 10, // Reveals smoothly right as basketball ignites into the Knight
      U_CHESS_START + 42,
      null, // Remains visible through final Chess frames as stage transitions cleanly to normal scrolling
      null
    ),
  };

  const sportFrames = SPORT_FRAME_MAP[activeSportId];
  const frame = sportFrames[sportFrameIndex];
  const globalFrameIndex = SPORT_GLOBAL_OFFSETS[activeSportId] + sportFrameIndex;
  const folderMeta = FOLDER_META[frame.folder];

  return {
    progress,
    unit: u,
    activeSportId,
    activeChapterId,
    sportFrameIndex,
    globalFrameIndex,
    frame,
    folderMeta,
    blackoutOpacity,
    heroOverlay,
    sportOverlays,
    isInBlackout,
  };
}
