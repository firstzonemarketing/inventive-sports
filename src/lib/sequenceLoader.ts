import {
  ALL_MASTER_FRAMES,
  FrameEntry,
  PRIORITY_ANCHOR_URLS,
} from './sequences';

const MAX_CACHE_SIZE = 280;
const MAX_CONCURRENT_LOADS = 6;
const LOOKAHEAD_AHEAD = 44;
const LOOKAHEAD_BEHIND = 14;

export class SequenceFrameCache {
  private cache = new Map<string, HTMLImageElement>();
  private inFlight = new Set<string>();
  private pinnedUrls = new Set<string>(PRIORITY_ANCHOR_URLS);
  private pendingQueue: string[] = [];
  private activeLoads = 0;
  private onFrameDecoded: ((url: string) => void) | null = null;
  private disposed = false;

  constructor(onFrameDecoded?: (url: string) => void) {
    this.onFrameDecoded = onFrameDecoded ?? null;
  }

  public setCallback(cb: ((url: string) => void) | null) {
    this.onFrameDecoded = cb;
  }

  /**
   * Immediately loads Hero Frame 1 first, then warms all folder anchor frames
   * and the opening Hero Stadium sequence.
   */
  public preloadInitial() {
    if (this.disposed) return;

    // Highest priority: Hero Stadium Frame 1
    const firstHero = ALL_MASTER_FRAMES[0]?.url;
    if (firstHero) {
      this.enqueueUrl(firstHero, true);
    }

    // Warm first 40 frames of Hero Stadium + all folder boundary anchors
    const warmUrls: string[] = [];
    for (let i = 1; i < Math.min(42, ALL_MASTER_FRAMES.length); i += 1) {
      warmUrls.push(ALL_MASTER_FRAMES[i].url);
    }
    for (const anchor of PRIORITY_ANCHOR_URLS) {
      warmUrls.push(anchor);
    }

    for (const url of warmUrls) {
      this.enqueueUrl(url, false);
    }
    this.pumpQueue();
  }

  /**
   * Preloads a sliding window around `globalFrameIndex` biased toward `direction` (+1 forward, -1 reverse).
   */
  public preloadAround(globalFrameIndex: number, direction: 1 | -1 = 1) {
    if (this.disposed) return;

    const total = ALL_MASTER_FRAMES.length;
    const clampedIdx = Math.max(0, Math.min(total - 1, globalFrameIndex));
    const urgentUrls: string[] = [];

    // Exact target frame goes straight to front of queue
    urgentUrls.push(ALL_MASTER_FRAMES[clampedIdx].url);

    const primarySteps = LOOKAHEAD_AHEAD;
    const secondarySteps = LOOKAHEAD_BEHIND;

    // Interleave nearby frames ahead & behind for instant forward + backward scrubbing
    for (let offset = 1; offset <= primarySteps; offset += 1) {
      const aheadIdx = clampedIdx + offset * direction;
      if (aheadIdx >= 0 && aheadIdx < total) {
        urgentUrls.push(ALL_MASTER_FRAMES[aheadIdx].url);
      }
      if (offset <= secondarySteps) {
        const behindIdx = clampedIdx - offset * direction;
        if (behindIdx >= 0 && behindIdx < total) {
          urgentUrls.push(ALL_MASTER_FRAMES[behindIdx].url);
        }
      }
    }

    // Rebuild queue prioritizing closest frames to current scroll position
    const nextQueue: string[] = [];
    const seen = new Set<string>();
    for (const url of urgentUrls) {
      if (!this.cache.has(url) && !this.inFlight.has(url) && !seen.has(url)) {
        seen.add(url);
        nextQueue.push(url);
      }
    }

    // Retain anchor frames at the back if not yet loaded
    for (const anchor of PRIORITY_ANCHOR_URLS) {
      if (
        !this.cache.has(anchor) &&
        !this.inFlight.has(anchor) &&
        !seen.has(anchor)
      ) {
        seen.add(anchor);
        nextQueue.push(anchor);
      }
    }

    this.pendingQueue = nextQueue;
    this.pumpQueue();
  }

  /**
   * Returns exact decoded frame if ready, or the nearest decoded frame strictly
   * inside the SAME sport sequence so we never flash blank or leak another sport.
   */
  public getBestAvailableFrame(
    sportFrames: FrameEntry[],
    targetIndex: number
  ): { image: HTMLImageElement; exact: boolean; matchedFolder: FrameEntry['folder'] } | null {
    const exactEntry = sportFrames[targetIndex];
    if (!exactEntry) return null;

    const exactImg = this.cache.get(exactEntry.url);
    if (exactImg && exactImg.complete && exactImg.naturalWidth > 0) {
      this.touchCacheKey(exactEntry.url, exactImg);
      return {
        image: exactImg,
        exact: true,
        matchedFolder: exactEntry.folder,
      };
    }

    // Search outward strictly within the SAME folder first, then same sport
    const maxRadius = sportFrames.length;
    for (let radius = 1; radius < maxRadius; radius += 1) {
      const prevIdx = targetIndex - radius;
      if (prevIdx >= 0) {
        const candidate = sportFrames[prevIdx];
        if (candidate.folder === exactEntry.folder) {
          const img = this.cache.get(candidate.url);
          if (img && img.complete && img.naturalWidth > 0) {
            return {
              image: img,
              exact: false,
              matchedFolder: candidate.folder,
            };
          }
        }
      }
      const nextIdx = targetIndex + radius;
      if (nextIdx < sportFrames.length) {
        const candidate = sportFrames[nextIdx];
        if (candidate.folder === exactEntry.folder) {
          const img = this.cache.get(candidate.url);
          if (img && img.complete && img.naturalWidth > 0) {
            return {
              image: img,
              exact: false,
              matchedFolder: candidate.folder,
            };
          }
        }
      }
    }

    // Fallback: any loaded frame in the same sport
    for (let radius = 1; radius < maxRadius; radius += 1) {
      const prevIdx = targetIndex - radius;
      if (prevIdx >= 0) {
        const candidate = sportFrames[prevIdx];
        const img = this.cache.get(candidate.url);
        if (img && img.complete && img.naturalWidth > 0) {
          return {
            image: img,
            exact: false,
            matchedFolder: candidate.folder,
          };
        }
      }
      const nextIdx = targetIndex + radius;
      if (nextIdx < sportFrames.length) {
        const candidate = sportFrames[nextIdx];
        const img = this.cache.get(candidate.url);
        if (img && img.complete && img.naturalWidth > 0) {
          return {
            image: img,
            exact: false,
            matchedFolder: candidate.folder,
          };
        }
      }
    }

    return null;
  }

  private enqueueUrl(url: string, front: boolean) {
    if (this.cache.has(url) || this.inFlight.has(url)) return;
    if (this.pendingQueue.includes(url)) return;
    if (front) {
      this.pendingQueue.unshift(url);
    } else {
      this.pendingQueue.push(url);
    }
  }

  private pumpQueue() {
    if (this.disposed) return;

    while (
      this.activeLoads < MAX_CONCURRENT_LOADS &&
      this.pendingQueue.length > 0
    ) {
      const url = this.pendingQueue.shift();
      if (!url || this.cache.has(url) || this.inFlight.has(url)) continue;

      this.inFlight.add(url);
      this.activeLoads += 1;

      const img = new Image();
      img.decoding = 'async';

      const finish = (ok: boolean) => {
        this.inFlight.delete(url);
        this.activeLoads = Math.max(0, this.activeLoads - 1);

        if (!this.disposed && ok && img.naturalWidth > 0) {
          this.storeInCache(url, img);
          if (this.onFrameDecoded) {
            this.onFrameDecoded(url);
          }
        }

        if (!this.disposed) {
          this.pumpQueue();
        }
      };

      img.onload = () => {
        if (typeof img.decode === 'function') {
          img
            .decode()
            .then(() => finish(true))
            .catch(() => finish(true));
        } else {
          finish(true);
        }
      };
      img.onerror = () => finish(false);
      img.src = url;
    }
  }

  private touchCacheKey(url: string, img: HTMLImageElement) {
    this.cache.delete(url);
    this.cache.set(url, img);
  }

  private storeInCache(url: string, img: HTMLImageElement) {
    this.cache.delete(url);
    this.cache.set(url, img);

    if (this.cache.size <= MAX_CACHE_SIZE) return;

    // Evict oldest non-pinned entries
    for (const key of this.cache.keys()) {
      if (this.cache.size <= MAX_CACHE_SIZE) break;
      if (this.pinnedUrls.has(key)) continue;
      this.cache.delete(key);
    }
  }

  public dispose() {
    this.disposed = true;
    this.pendingQueue = [];
    this.inFlight.clear();
    this.cache.clear();
    this.onFrameDecoded = null;
  }
}
