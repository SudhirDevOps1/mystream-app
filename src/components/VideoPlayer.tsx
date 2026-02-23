import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause, Volume2, Volume1, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, Loader2, Settings, RotateCcw, RotateCw,
  Monitor, AlertCircle, Youtube, Cloud
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { isYouTubeLink, isMegaLink, getMegaEmbedUrl, formatTime, getThumbnail } from '@/types';
import type { MediaItem } from '@/types';

interface VideoPlayerProps {
  item: MediaItem;
  onEnded: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function getYTVideoId(url: string): string {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

function getResLabel(h: number): string {
  if (h >= 2160) return '2160p (4K)';
  if (h >= 1440) return '1440p';
  if (h >= 1080) return '1080p';
  if (h >= 720) return '720p';
  if (h >= 480) return '480p';
  if (h >= 360) return '360p';
  if (h >= 240) return '240p';
  return h > 0 ? `${h}p` : '';
}

/* ━━━ ROBUST Fullscreen Helpers ━━━ */
function _canFullscreen(): boolean {
  return !!(
    document.fullscreenEnabled ||
    (document as any).webkitFullscreenEnabled ||
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
  );
}
void _canFullscreen;

function isCurrentlyFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
}

async function requestFS(el: HTMLElement): Promise<boolean> {
  if (el.requestFullscreen) {
    try { await el.requestFullscreen(); return true; } catch { /* continue */ }
  }
  if ((el as any).webkitRequestFullscreen) {
    try { (el as any).webkitRequestFullscreen(); return true; } catch { /* continue */ }
  }
  if ((el as any).webkitRequestFullScreen) {
    try { (el as any).webkitRequestFullScreen(); return true; } catch { /* continue */ }
  }
  if ((el as any).mozRequestFullScreen) {
    try { (el as any).mozRequestFullScreen(); return true; } catch { /* continue */ }
  }
  if ((el as any).msRequestFullscreen) {
    try { (el as any).msRequestFullscreen(); return true; } catch { /* continue */ }
  }
  return false;
}

async function exitFS(): Promise<boolean> {
  if (document.exitFullscreen) {
    try { await document.exitFullscreen(); return true; } catch { /* continue */ }
  }
  if ((document as any).webkitExitFullscreen) {
    try { (document as any).webkitExitFullscreen(); return true; } catch { /* continue */ }
  }
  if ((document as any).webkitCancelFullScreen) {
    try { (document as any).webkitCancelFullScreen(); return true; } catch { /* continue */ }
  }
  if ((document as any).mozCancelFullScreen) {
    try { (document as any).mozCancelFullScreen(); return true; } catch { /* continue */ }
  }
  if ((document as any).msExitFullscreen) {
    try { (document as any).msExitFullscreen(); return true; } catch { /* continue */ }
  }
  return false;
}

async function lockLandscape() {
  try {
    const orientation = screen.orientation as any;
    if (orientation?.lock) await orientation.lock('landscape');
  } catch { /* not supported */ }
}

async function unlockOrientation() {
  try {
    const orientation = screen.orientation as any;
    if (orientation?.unlock) orientation.unlock();
  } catch { /* not supported */ }
}

async function enterFullscreen(container: HTMLElement, videoEl?: HTMLVideoElement | null) {
  let success = await requestFS(container);

  if (!success && videoEl) {
    if ((videoEl as any).webkitEnterFullscreen) {
      try { (videoEl as any).webkitEnterFullscreen(); success = true; } catch { /* */ }
    }
    if (!success && (videoEl as any).webkitEnterFullScreen) {
      try { (videoEl as any).webkitEnterFullScreen(); success = true; } catch { /* */ }
    }
    if (!success) {
      success = await requestFS(videoEl);
    }
  }

  if (!success) {
    const iframe = container.querySelector('iframe');
    if (iframe) {
      success = await requestFS(iframe);
    }
  }

  if (success) await lockLandscape();
  return success;
}

async function doExitFullscreen() {
  const result = await exitFS();
  if (result) await unlockOrientation();
  return result;
}

function onFullscreenChange(callback: () => void) {
  document.addEventListener('fullscreenchange', callback);
  document.addEventListener('webkitfullscreenchange', callback);
  document.addEventListener('mozfullscreenchange', callback);
  document.addEventListener('MSFullscreenChange', callback);
  return () => {
    document.removeEventListener('fullscreenchange', callback);
    document.removeEventListener('webkitfullscreenchange', callback);
    document.removeEventListener('mozfullscreenchange', callback);
    document.removeEventListener('MSFullscreenChange', callback);
  };
}

/* ━━━ Helper: Add allowfullscreen + sandbox to YouTube iframe ━━━ */
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-forms';
const IFRAME_ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';

function patchIframe(iframe: HTMLIFrameElement) {
  if (!iframe.hasAttribute('allowfullscreen')) {
    iframe.setAttribute('allowfullscreen', '');
  }
  iframe.setAttribute('allow', IFRAME_ALLOW);
  if (!iframe.hasAttribute('sandbox')) {
    iframe.setAttribute('sandbox', IFRAME_SANDBOX);
  }
}

function ensureIframeFullscreenAllowed(container: HTMLElement) {
  const observer = new MutationObserver(() => {
    container.querySelectorAll('iframe').forEach(patchIframe);
  });
  observer.observe(container, { childList: true, subtree: true });
  container.querySelectorAll('iframe').forEach(patchIframe);
  return () => observer.disconnect();
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   YOUTUBE PLAYER — Uses YouTube's NATIVE controls
   Quality selection works via YouTube's built-in ⚙️ gear
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function YouTubePlayer({ item, onEnded, onNext, onPrev }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentQuality, setCurrentQuality] = useState('');
  const [playingSuggestion, setPlayingSuggestion] = useState(false);
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const expectedVideoId = useRef(getYTVideoId(item.link));

  const videoId = useMemo(() => getYTVideoId(item.link), [item.link]);

  useEffect(() => {
    expectedVideoId.current = videoId;
  }, [videoId]);

  useEffect(() => {
    const container = ytRef.current;
    if (!container) return;
    return ensureIframeFullscreenAllowed(container);
  }, []);

  useEffect(() => {
    if (!videoId) return;
    let destroyed = false;
    let attempts = 0;

    const init = () => {
      if (destroyed || !ytRef.current) return;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* */ }
        playerRef.current = null;
      }

      setLoading(true);
      setReady(false);
      setErrorState(false);
      setCurrentQuality('');
      setPlayingSuggestion(false);
      setSuggestionTitle('');

      ytRef.current.innerHTML = '';
      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      ytRef.current.appendChild(div);

      const YT = (window as any).YT;
      playerRef.current = new YT.Player(div, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 1,
          modestbranding: 1,
          rel: 1,
          fs: 1,
          playsinline: 1,
          iv_load_policy: 3,
          enablejsapi: 1,
          cc_load_policy: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (destroyed) return;
            setReady(true);
            setLoading(false);
            if (ytRef.current) {
              ytRef.current.querySelectorAll('iframe').forEach(patchIframe);
            }
          },
          onStateChange: (e: any) => {
            if (destroyed) return;
            const YT2 = (window as any).YT;
            switch (e.data) {
              case YT2.PlayerState.PLAYING: {
                setLoading(false);
                try {
                  const q = playerRef.current?.getPlaybackQuality?.();
                  if (q) setCurrentQuality(q);
                } catch { /* */ }
                try {
                  const nowUrl = playerRef.current?.getVideoUrl?.() || '';
                  const nowId = getYTVideoId(nowUrl);
                  if (nowId && nowId !== expectedVideoId.current) {
                    setPlayingSuggestion(true);
                    const data = playerRef.current?.getVideoData?.();
                    setSuggestionTitle(data?.title || 'YouTube Suggestion');
                  } else {
                    setPlayingSuggestion(false);
                    setSuggestionTitle('');
                  }
                } catch { /* */ }
                break;
              }
              case YT2.PlayerState.BUFFERING:
                setLoading(true);
                break;
              case YT2.PlayerState.ENDED: {
                onEnded();
                break;
              }
            }
          },
          onPlaybackQualityChange: (e: any) => {
            if (!destroyed) setCurrentQuality(e.data || '');
          },
          onError: () => {
            if (!destroyed) { setLoading(false); setErrorState(true); }
          },
        },
      });
    };

    const check = () => {
      if (destroyed) return;
      const YT = (window as any).YT;
      if (YT?.Player) init();
      else if (++attempts < 50) setTimeout(check, 200);
      else setLoading(false);
    };
    check();

    return () => {
      destroyed = true;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* */ }
        playerRef.current = null;
      }
    };
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return onFullscreenChange(() => setIsFullscreen(isCurrentlyFullscreen()));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const c = containerRef.current;
    if (!c) return;
    if (!isCurrentlyFullscreen()) {
      await enterFullscreen(c, null);
    } else {
      await doExitFullscreen();
    }
  }, []);

  const resetHideTimer = useCallback(() => {
    setShowOverlay(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowOverlay(false), 4000);
  }, []);

  const qualityLabels: Record<string, string> = {
    hd2160: '4K', hd1440: '2K', hd1080: '1080p', hd720: '720p',
    large: '480p', medium: '360p', small: '240p', tiny: '144p',
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/50 border border-white/[0.06]",
        isFullscreen && "rounded-none border-none"
      )}
      onMouseMove={resetHideTimer}
      onMouseEnter={() => setShowOverlay(true)}
    >
      <div className={cn(
        "relative w-full bg-black",
        isFullscreen ? "h-screen" : "aspect-video"
      )}>
        <div
          ref={ytRef}
          className="absolute inset-0 z-[5] [&>iframe]:!w-full [&>iframe]:!h-full [&>div]:!w-full [&>div]:!h-full"
        />

        {loading && (
          <div className="absolute inset-0 z-[3] flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 sm:h-14 sm:w-14 animate-spin text-violet-400" />
              <span className="text-xs text-white/50">Loading video...</span>
            </div>
          </div>
        )}

        {errorState && (
          <div className="absolute inset-0 z-[20] flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <AlertCircle className="h-12 w-12 text-red-400/70" />
              <p className="text-sm text-white/80 font-medium">Video unavailable</p>
              <p className="text-xs text-gray-500">This video may be restricted or private</p>
              <button onClick={onNext} className="mt-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 transition">
                Play Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={cn(
        'absolute inset-x-0 top-0 z-[4] pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-all duration-300 no-select',
        showOverlay ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      )}>
        <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Youtube className="h-5 w-5 text-red-500 shrink-0" />
            <p className="truncate text-sm sm:text-base font-semibold text-white">{item.title}</p>
            {currentQuality && qualityLabels[currentQuality] && (
              <span className="shrink-0 rounded-md bg-violet-500/25 border border-violet-500/30 px-2 py-0.5 text-[10px] font-bold text-violet-200 flex items-center gap-1">
                <Monitor className="h-2.5 w-2.5" />
                {qualityLabels[currentQuality]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
            <button onClick={onPrev}
              className="p-2 text-white/70 hover:text-white transition rounded-lg hover:bg-white/10 active:scale-95"
              title="Previous video">
              <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
            </button>
            <button onClick={onNext}
              className="p-2 text-white/70 hover:text-white transition rounded-lg hover:bg-white/10 active:scale-95"
              title="Next video">
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
            </button>
            <button onClick={toggleFullscreen}
              className="p-2.5 text-white/80 hover:text-white transition rounded-lg hover:bg-white/15 bg-white/5 active:scale-95"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen (auto-rotate)"}>
              {isFullscreen ? <Minimize className="h-5 w-5 sm:h-6 sm:w-6" /> : <Maximize className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>
      </div>

      {playingSuggestion && ready && (
        <div className="absolute bottom-14 inset-x-0 z-[6] flex justify-center px-3 pointer-events-none">
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-900/95 to-indigo-900/95 backdrop-blur-xl border border-violet-400/30 px-4 py-2.5 shadow-2xl shadow-violet-500/20 pointer-events-auto max-w-md w-full">
            <Youtube className="h-5 w-5 text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-violet-300/70 uppercase tracking-wider font-medium">Playing suggestion</p>
              <p className="text-xs text-white truncate">{suggestionTitle}</p>
            </div>
            <button
              onClick={() => {
                setPlayingSuggestion(false);
                setSuggestionTitle('');
                try {
                  playerRef.current?.loadVideoById?.(expectedVideoId.current);
                } catch { /* */ }
              }}
              className="shrink-0 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-medium px-3 py-1.5 transition active:scale-95 border border-white/10"
            >
              ← Back to playlist
            </button>
          </div>
        </div>
      )}

      {ready && !errorState && !playingSuggestion && (
        <div className={cn(
          'absolute bottom-2 left-3 z-[4] transition-all duration-500 pointer-events-none',
          showOverlay ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 px-2.5 py-1.5">
            <Settings className="h-3 w-3 text-white/50" />
            <span className="text-[10px] text-white/50">⚙️ Quality • Click suggestions to play here • Auto-next from playlist</span>
          </div>
        </div>
      )}
    </div>
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MEGA.NZ VIDEO PLAYER
   Uses Mega's iframe embed — Mega handles decryption,
   streaming, and provides its own built-in controls.
   Supports:
     mega.nz/file/ID#KEY  → auto-converted to embed
     mega.nz/embed/ID#KEY → used directly
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function MegaPlayer({ item, onNext, onPrev }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const embedUrl = useMemo(() => getMegaEmbedUrl(item.link, 'video'), [item.link]);

  // Reset loading on new item
  useEffect(() => { setLoading(true); }, [item.id]);

  // Fullscreen listener
  useEffect(() => {
    return onFullscreenChange(() => setIsFullscreen(isCurrentlyFullscreen()));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const c = containerRef.current;
    if (!c) return;
    if (!isCurrentlyFullscreen()) {
      await enterFullscreen(c, null);
    } else {
      await doExitFullscreen();
    }
  }, []);

  const resetHideTimer = useCallback(() => {
    setShowOverlay(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowOverlay(false), 4000);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/50 border border-white/[0.06]",
        isFullscreen && "rounded-none border-none"
      )}
      onMouseMove={resetHideTimer}
      onMouseEnter={() => setShowOverlay(true)}
    >
      {/* Video area */}
      <div className={cn(
        "relative w-full bg-black",
        isFullscreen ? "h-screen" : "aspect-video"
      )}>
        {/* Mega iframe — full z-index so Mega's own controls work */}
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full z-[5]"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen"
          onLoad={() => setLoading(false)}
        />

        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 z-[3] flex items-center justify-center bg-black/60 pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 sm:h-14 sm:w-14 animate-spin text-red-400" />
              <span className="text-xs text-white/50">Loading from Mega.nz...</span>
              <span className="text-[10px] text-white/30">Decrypting & streaming</span>
            </div>
          </div>
        )}
      </div>

      {/* Top overlay — pointer-events-none, only buttons clickable */}
      <div className={cn(
        'absolute inset-x-0 top-0 z-[4] pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent transition-all duration-300 no-select',
        showOverlay ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      )}>
        <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 sm:py-4">
          {/* Title + MEGA badge */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Cloud className="h-5 w-5 text-red-500 shrink-0" />
            <p className="truncate text-sm sm:text-base font-semibold text-white">{item.title}</p>
            <span className="shrink-0 rounded-md bg-red-500/25 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-200 flex items-center gap-1">
              <Cloud className="h-2.5 w-2.5" />
              MEGA
            </span>
          </div>

          {/* Navigation controls — ONLY these get pointer-events */}
          <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
            <button onClick={onPrev}
              className="p-2 text-white/70 hover:text-white transition rounded-lg hover:bg-white/10 active:scale-95"
              title="Previous">
              <SkipBack className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
            </button>
            <button onClick={onNext}
              className="p-2 text-white/70 hover:text-white transition rounded-lg hover:bg-white/10 active:scale-95"
              title="Next">
              <SkipForward className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
            </button>
            <button onClick={toggleFullscreen}
              className="p-2.5 text-white/80 hover:text-white transition rounded-lg hover:bg-white/15 bg-white/5 active:scale-95"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen (auto-rotate)"}>
              {isFullscreen ? <Minimize className="h-5 w-5 sm:h-6 sm:w-6" /> : <Maximize className="h-5 w-5 sm:h-6 sm:w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      {!loading && (
        <div className={cn(
          'absolute bottom-2 left-3 z-[4] transition-all duration-500 pointer-events-none',
          showOverlay ? 'opacity-100' : 'opacity-0'
        )}>
          <div className="flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 px-2.5 py-1.5">
            <Cloud className="h-3 w-3 text-red-400/50" />
            <span className="text-[10px] text-white/50">🔒 Mega.nz encrypted stream • Use Mega's built-in controls for playback</span>
          </div>
        </div>
      )}
    </div>
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   DIRECT VIDEO PLAYER (MP4)
   Full custom controls — everything works
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function DirectVideoPlayer({ item, onEnded, onNext, onPrev }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [prevVolume, setPrevVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [detectedQuality, setDetectedQuality] = useState('');

  const thumbnail = useMemo(() => getThumbnail(item), [item]);

  // Load new video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setLoading(true); setPlaying(false); setCurrentTime(0); setDuration(0);
    setBuffered(0); setShowSettings(false); setDetectedQuality('');
    video.pause(); video.src = item.link; video.load();
    video.volume = volume; video.muted = false; video.playbackRate = playbackRate;
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume
  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.volume = muted ? 0 : volume; v.muted = false; }
  }, [volume, muted]);

  // Sync speed
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = playbackRate;
  }, [playbackRate]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current; const bar = progressRef.current;
    if (!v || !bar || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * v.duration;
    setCurrentTime(v.currentTime);
  }, []);

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current; const v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(e.clientX - rect.left); setHoverTime(pos * v.duration);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v); setMuted(v === 0); if (v > 0) setPrevVolume(v);
  }, []);

  const toggleMute = useCallback(() => {
    if (muted || volume === 0) {
      const r = prevVolume > 0 ? prevVolume : 0.5;
      setVolume(r); setMuted(false);
    } else {
      setPrevVolume(volume); setMuted(true);
    }
  }, [muted, volume, prevVolume]);

  const toggleFullscreen = useCallback(async () => {
    if (!isCurrentlyFullscreen()) {
      const c = containerRef.current;
      const v = videoRef.current;
      if (c) await enterFullscreen(c, v);
    } else {
      await doExitFullscreen();
    }
  }, []);

  const skipFwd = useCallback(() => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.min(v.currentTime + 10, v.duration || 0);
  }, []);

  const skipBwd = useCallback(() => {
    const v = videoRef.current;
    if (v) v.currentTime = Math.max(v.currentTime - 10, 0);
  }, []);

  useEffect(() => {
    return onFullscreenChange(() => setIsFullscreen(isCurrentlyFullscreen()));
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); togglePlay(); break;
        case 'f': e.preventDefault(); toggleFullscreen(); break;
        case 'm': e.preventDefault(); toggleMute(); break;
        case 'arrowleft': e.preventDefault(); skipBwd(); break;
        case 'arrowright': e.preventDefault(); skipFwd(); break;
        case 'arrowup': e.preventDefault(); setVolume(v => Math.min(v + 0.1, 1)); setMuted(false); break;
        case 'arrowdown': e.preventDefault(); setVolume(v => { const n = Math.max(v - 0.1, 0); if (n === 0) setMuted(true); return n; }); break;
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [togglePlay, toggleFullscreen, toggleMute, skipBwd, skipFwd]);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => { if (playing) setShowControls(false); }, 3000);
  }, [playing]);

  const updateBuffered = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.buffered.length || !v.duration) return;
    setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volPct = muted ? 0 : volume * 100;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/50 border border-white/[0.06]",
        isFullscreen && "rounded-none border-none fixed inset-0 z-[9999]"
      )}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (playing) setShowControls(false); setShowSettings(false); }}
      onMouseEnter={() => setShowControls(true)}
      onTouchStart={resetHideTimer}
    >
      <div className={cn(
        "relative w-full cursor-pointer",
        isFullscreen ? "h-full" : "aspect-video"
      )} onClick={togglePlay} onDoubleClick={toggleFullscreen}>
        <video
          ref={videoRef}
          className={cn(
            "w-full bg-black",
            isFullscreen ? "h-full object-contain" : "h-full object-contain"
          )}
          preload="auto"
          playsInline
          poster={thumbnail || undefined}
          onTimeUpdate={() => { setCurrentTime(videoRef.current?.currentTime ?? 0); updateBuffered(); }}
          onLoadedMetadata={() => {
            const v = videoRef.current;
            if (v) {
              setDuration(v.duration);
              v.volume = muted ? 0 : volume;
              if (v.videoHeight > 0) setDetectedQuality(getResLabel(v.videoHeight));
            }
            setLoading(false);
          }}
          onLoadedData={() => {
            const v = videoRef.current;
            if (v && v.videoHeight > 0 && !detectedQuality) setDetectedQuality(getResLabel(v.videoHeight));
          }}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onPlaying={() => { setLoading(false); setPlaying(true); }}
          onEnded={onEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onProgress={updateBuffered}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-violet-400" />
              <span className="text-xs text-white/50">Loading...</span>
            </div>
          </div>
        )}

        {!playing && !loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-violet-600/90 shadow-2xl shadow-violet-500/40 transition-transform duration-300 hover:scale-110 active:scale-95">
              <Play className="ml-1 h-7 w-7 sm:h-9 sm:w-9 text-white" fill="white" />
            </div>
          </div>
        )}
      </div>

      {/* Custom controls overlay */}
      <div className={cn(
        'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-all duration-300 no-select',
        showControls || !playing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      )} onClick={e => e.stopPropagation()}>
        <div className="px-3 sm:px-4 pt-16 pb-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="truncate text-xs sm:text-sm font-medium text-white/80 flex-1">{item.title}</p>
            {detectedQuality && (
              <span className="shrink-0 rounded-md bg-violet-500/20 border border-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-300 flex items-center gap-1">
                <Monitor className="h-2.5 w-2.5" />{detectedQuality}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div
            ref={progressRef}
            className="group/prog relative h-1.5 sm:h-2 w-full cursor-pointer rounded-full bg-white/15 hover:h-3 transition-all"
            onClick={handleProgressClick}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: `${buffered}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover/prog:opacity-100 transition-opacity" />
            </div>
            {hoverTime !== null && (
              <div className="absolute -top-8 -translate-x-1/2 rounded bg-black/90 px-2 py-0.5 text-[10px] text-white pointer-events-none" style={{ left: `${hoverPos}px` }}>
                {formatTime(hoverTime)}
              </div>
            )}
          </div>
          <div className="flex justify-between text-[9px] sm:text-[11px] tabular-nums text-white/40 mt-1 mb-1">
            <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Button row */}
        <div className="flex items-center justify-between px-2 sm:px-3 pb-2.5 sm:pb-3 gap-1">
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button onClick={onPrev} className="p-1.5 sm:p-2 text-white/60 hover:text-white transition rounded-lg hover:bg-white/10" title="Previous">
              <SkipBack className="h-4 w-4" fill="currentColor" />
            </button>
            <button onClick={skipBwd} className="p-1.5 text-white/60 hover:text-white transition rounded-lg hover:bg-white/10" title="Back 10s">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button onClick={togglePlay}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white text-gray-900 transition-transform hover:scale-105 active:scale-95 shadow-lg mx-1">
              {playing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
            </button>
            <button onClick={skipFwd} className="p-1.5 text-white/60 hover:text-white transition rounded-lg hover:bg-white/10" title="Forward 10s">
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={onNext} className="p-1.5 sm:p-2 text-white/60 hover:text-white transition rounded-lg hover:bg-white/10" title="Next">
              <SkipForward className="h-4 w-4" fill="currentColor" />
            </button>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Volume */}
            <div className="flex items-center gap-1.5 rounded-lg px-1.5 sm:px-2 py-1">
              <button onClick={toggleMute} className="text-white/60 hover:text-white transition p-0.5">
                <VolumeIcon className="h-4 w-4" />
              </button>
              <div className="relative w-16 sm:w-20 h-1.5 rounded-full bg-white/20">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 to-indigo-400" style={{ width: `${volPct}%` }} />
                <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
                <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow pointer-events-none"
                  style={{ left: `calc(${volPct}% - 6px)` }} />
              </div>
              <span className="hidden sm:block text-[9px] tabular-nums text-white/40 w-6 text-right">{Math.round(volPct)}%</span>
            </div>

            {/* Speed settings */}
            <div className="relative">
              <button onClick={() => setShowSettings(!showSettings)}
                className={cn('p-1.5 rounded-lg transition-all',
                  showSettings ? 'text-violet-400 bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10')}>
                <Settings className="h-4 w-4" />
              </button>
              {playbackRate !== 1 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white">
                  {playbackRate}x
                </span>
              )}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 rounded-xl bg-gray-900/98 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden min-w-[180px] z-50"
                  onClick={e => e.stopPropagation()}>
                  <div className="border-b border-white/10 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Playback Speed</p>
                  </div>
                  {detectedQuality && (
                    <div className="border-b border-white/10 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3.5 w-3.5 text-violet-400" />
                        <div>
                          <p className="text-xs font-semibold text-violet-300">{detectedQuality}</p>
                          <p className="text-[9px] text-white/30">Source quality</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="p-1.5">
                    {SPEEDS.map(r => (
                      <button key={r}
                        onClick={() => { setPlaybackRate(r); setShowSettings(false); }}
                        className={cn(
                          'w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between',
                          playbackRate === r
                            ? 'bg-violet-500/20 text-violet-300 font-medium'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                        )}>
                        <span>{r}x {r === 1 && <span className="text-white/25 ml-1">(Normal)</span>}</span>
                        {playbackRate === r && <span className="text-violet-400 text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen}
              className="p-2 sm:p-2.5 text-white/70 hover:text-white transition rounded-lg hover:bg-white/15 bg-white/5"
              title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen (F)"}>
              {isFullscreen ? <Minimize className="h-4 w-4 sm:h-5 sm:w-5" /> : <Maximize className="h-4 w-4 sm:h-5 sm:w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ━━━━━━━━━━━ MAIN EXPORT ━━━━━━━━━━━ */
export function VideoPlayer(props: VideoPlayerProps) {
  if (isYouTubeLink(props.item.link)) return <YouTubePlayer {...props} />;
  if (isMegaLink(props.item.link)) return <MegaPlayer {...props} />;
  return <DirectVideoPlayer {...props} />;
}
