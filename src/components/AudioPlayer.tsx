import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause, Volume2, Volume1, VolumeX,
  SkipForward, SkipBack, Loader2, Repeat, Gauge, Cloud
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatTime, getThumbnail, isMegaLink, getMegaEmbedUrl } from '@/types';
import type { MediaItem } from '@/types';

interface AudioPlayerProps {
  item: MediaItem;
  onEnded: () => void;
  onNext: () => void;
  onPrev: () => void;
  accentColor?: 'emerald' | 'rose';
  icon?: React.ReactNode;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function AudioPlayer({ item, onEnded, onNext, onPrev, accentColor = 'emerald', icon }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [prevVolume, setPrevVolume] = useState(0.75);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);

  const thumbnail = useMemo(() => getThumbnail(item), [item]);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset image state when item changes
  useEffect(() => {
    setImgLoaded(false);
    setImgError(false);
  }, [item.id]);

  // Load new track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Skip if this is a Mega link (no HTML5 audio for Mega)
    if (isMegaLink(item.link)) return;
    setLoading(true); setPlaying(false); setCurrentTime(0);
    setDuration(0); setBuffered(0); setShowSpeed(false);
    audio.pause();
    audio.src = item.link;
    audio.load();
    audio.volume = volume;
    audio.playbackRate = speed;
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // CRITICAL: Always sync volume
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => { const a = audioRef.current; if (a) a.playbackRate = speed; }, [speed]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }, []);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current; const bar = progressRef.current;
    if (!a || !bar || !a.duration) return;
    const rect = bar.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * a.duration;
    setCurrentTime(a.currentTime);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value); setVolume(v); setMuted(v === 0); if (v > 0) setPrevVolume(v);
  }, []);

  const toggleMute = useCallback(() => {
    if (muted || volume === 0) { const r = prevVolume > 0 ? prevVolume : 0.5; setVolume(r); setMuted(false); }
    else { setPrevVolume(volume); setMuted(true); }
  }, [muted, volume, prevVolume]);

  const handleEnded = useCallback(() => {
    if (repeat) { const a = audioRef.current; if (a) { a.currentTime = 0; a.play().catch(() => {}); } }
    else onEnded();
  }, [repeat, onEnded]);

  const updateBuffered = useCallback(() => {
    const a = audioRef.current;
    if (!a || !a.buffered.length || !a.duration) return;
    setBuffered((a.buffered.end(a.buffered.length - 1) / a.duration) * 100);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volPct = muted ? 0 : volume * 100;
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Color theme
  const isRose = accentColor === 'rose';
  const gradientFrom = isRose ? 'from-rose-500' : 'from-emerald-500';
  const gradientTo = isRose ? 'to-pink-500' : 'to-teal-500';
  const progressGrad = isRose ? 'from-rose-500 to-pink-400' : 'from-emerald-500 to-teal-400';
  const volGrad = isRose ? 'from-rose-400 to-pink-400' : 'from-emerald-400 to-teal-400';
  const bgGlow = isRose ? 'bg-rose-500' : 'bg-emerald-500';
  const shadowColor = isRose ? 'shadow-rose-500/30' : 'shadow-emerald-500/30';
  const textAccent = isRose ? 'text-rose-400' : 'text-emerald-400';
  const subTextAccent = isRose ? 'text-rose-300/60' : 'text-emerald-300/60';
  const repeatBg = isRose ? 'bg-rose-500/15' : 'bg-emerald-500/15';
  const speedBg = isRose ? 'bg-rose-500/20' : 'bg-emerald-500/20';
  const speedText = isRose ? 'text-rose-300' : 'text-emerald-300';
  const bgTone = isRose ? 'to-rose-950/50' : 'to-emerald-950/50';

  const bars = Array.from({ length: 40 }, (_, i) => 20 + Math.sin(i * 0.7) * 25 + Math.cos(i * 1.3) * 20);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MEGA.NZ AUDIO — Uses Mega's iframe embed player
  // Mega handles decryption + streaming + playback controls
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isMegaLink(item.link)) {
    const megaUrl = getMegaEmbedUrl(item.link, 'audio');
    return (
      <div className={cn('overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900', bgTone, 'shadow-2xl shadow-black/40 border border-white/[0.06]')}>
        <div className="relative p-4 sm:p-5">
          {/* Ambient glow */}
          <div className={cn('absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[80px] opacity-15', bgGlow)} />

          {/* Track info with album art */}
          <div className="relative flex items-center gap-3 sm:gap-4 mb-4">
            {/* Album art */}
            <div className={cn(
              'relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl overflow-hidden',
              'shadow-xl', shadowColor
            )}>
              <div className={cn('absolute inset-0 bg-gradient-to-br', gradientFrom, gradientTo)} />
              {thumbnail && !imgError && (
                <img src={thumbnail} alt={item.title} loading="lazy"
                  onLoad={() => setImgLoaded(true)}
                  onError={() => setImgError(true)}
                  className={cn('absolute inset-0 w-full h-full object-cover transition-opacity duration-300', imgLoaded ? 'opacity-100' : 'opacity-0')}
                />
              )}
              <div className={cn('relative z-10 transition-opacity', thumbnail && imgLoaded && !imgError ? 'opacity-0' : 'opacity-100')}>
                {icon || (
                  <svg className="h-7 w-7 sm:h-8 sm:w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base sm:text-lg font-bold text-white">{item.title}</h3>
              <p className={cn('truncate text-xs sm:text-sm mt-0.5', subTextAccent)}>
                {item.host || item.author || item.category || 'Unknown Artist'}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 border border-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
                  <Cloud className="h-2.5 w-2.5" />MEGA
                </span>
                {item.category && (
                  <span className={cn('inline-block rounded-md px-2 py-0.5 text-[10px] font-medium', repeatBg, textAccent)}>
                    {item.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mega iframe embed — has its own playback controls */}
          <div className="relative rounded-xl overflow-hidden bg-black/40 border border-white/10 mb-4">
            <iframe
              src={megaUrl}
              className="w-full h-[120px] sm:h-[160px]"
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>

          {/* Prev / Next controls */}
          <div className="flex items-center justify-center gap-6 mb-3">
            <button onClick={onPrev} className="p-2 text-gray-300 hover:text-white transition hover:scale-110 active:scale-95">
              <SkipBack className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" />
            </button>
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r shadow-lg',
              gradientFrom, gradientTo, shadowColor
            )}>
              <Cloud className="h-5 w-5 text-white" />
            </div>
            <button onClick={onNext} className="p-2 text-gray-300 hover:text-white transition hover:scale-110 active:scale-95">
              <SkipForward className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" />
            </button>
          </div>

          {/* Hint */}
          <div className="flex items-center justify-center gap-1.5">
            <Cloud className="h-3 w-3 text-white/25" />
            <span className="text-[10px] text-white/30">🔒 Mega.nz encrypted stream • Use Mega's built-in controls for playback</span>
          </div>
        </div>
      </div>
    );
  }


  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DIRECT AUDIO PLAYER (MP3 / direct links)
  // Full custom controls — volume, seek, speed, repeat
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className={cn('overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900', bgTone, 'shadow-2xl shadow-black/40 border border-white/[0.06]')}>
      <audio ref={audioRef} preload="auto"
        onTimeUpdate={() => { setCurrentTime(audioRef.current?.currentTime ?? 0); updateBuffered(); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) { setDuration(a.duration); a.volume = muted ? 0 : volume; } setLoading(false); }}
        onWaiting={() => setLoading(true)} onCanPlay={() => setLoading(false)}
        onPlaying={() => { setLoading(false); setPlaying(true); }}
        onEnded={handleEnded} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onProgress={updateBuffered}
      />

      <div className="relative p-4 sm:p-5">
        {/* Ambient glow */}
        <div className={cn('absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-[80px] transition-opacity duration-700', playing ? 'opacity-25' : 'opacity-10', bgGlow)} />

        {/* Track info with album art */}
        <div className="relative flex items-center gap-3 sm:gap-4 mb-4 sm:mb-5">
          {/* Album art / Cover image */}
          <div className={cn(
            'relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl overflow-hidden',
            'shadow-xl', shadowColor,
            'transition-all duration-500',
            playing && 'animate-[spin_8s_linear_infinite]'
          )}>
            {/* Gradient fallback */}
            <div className={cn('absolute inset-0 bg-gradient-to-br', gradientFrom, gradientTo)} />
            {/* Thumbnail image */}
            {thumbnail && !imgError && (
              <img src={thumbnail} alt={item.title} loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={cn('absolute inset-0 w-full h-full object-cover transition-opacity duration-300', imgLoaded ? 'opacity-100' : 'opacity-0')}
              />
            )}
            {/* Icon overlay */}
            <div className={cn('relative z-10 transition-opacity', thumbnail && imgLoaded && !imgError ? 'opacity-0' : 'opacity-100')}>
              {icon || (
                <svg className="h-7 w-7 sm:h-8 sm:w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              )}
            </div>
            {/* Center dot for vinyl effect when spinning */}
            {playing && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-gray-900 border-2 border-gray-700" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base sm:text-lg font-bold text-white">{item.title}</h3>
            <p className={cn('truncate text-xs sm:text-sm mt-0.5', subTextAccent)}>
              {item.host || item.author || item.category || 'Unknown Artist'}
            </p>
            {item.category && (
              <span className={cn('inline-block mt-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium', repeatBg, textAccent)}>
                {item.category}
              </span>
            )}
          </div>
          {loading && <Loader2 className={cn('shrink-0 h-5 w-5 animate-spin', textAccent)} />}
        </div>

        {/* Waveform */}
        <div className="flex h-12 sm:h-16 items-end justify-center gap-[2px] mb-4 px-1">
          {bars.map((height, i) => {
            const barProg = (i / bars.length) * 100;
            const active = barProg <= progress;
            const buf = barProg <= buffered;
            return (
              <div key={i}
                className={cn('flex-1 max-w-[5px] rounded-full transition-all duration-200',
                  active ? cn('bg-gradient-to-t', gradientFrom, gradientTo) : buf ? 'bg-white/10' : 'bg-white/[0.04]'
                )}
                style={{ height: `${playing && active ? height + Math.sin(Date.now() / 300 + i) * 8 : height}%` }}
              />
            );
          })}
        </div>

        {/* Progress bar */}
        <div ref={progressRef}
          className="group/prog relative h-2 sm:h-2.5 w-full cursor-pointer rounded-full bg-white/10 hover:h-3 transition-all mb-1"
          onClick={handleProgressClick}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/10" style={{ width: `${buffered}%` }} />
          <div className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', progressGrad)} style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover/prog:opacity-100 transition-opacity" />
          </div>
        </div>
        <div className="flex justify-between text-[9px] sm:text-[11px] tabular-nums text-white/30 mb-4">
          <span>{formatTime(currentTime)}</span>
          <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4">
          <button onClick={() => setRepeat(!repeat)}
            className={cn('p-2 rounded-lg transition-all', repeat ? cn(textAccent, repeatBg) : 'text-gray-500 hover:text-white hover:bg-white/5')}>
            <Repeat className="h-4 w-4" />
          </button>
          <button onClick={onPrev} className="p-2 text-gray-300 hover:text-white transition hover:scale-110 active:scale-95">
            <SkipBack className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" />
          </button>
          <button onClick={togglePlay}
            className={cn('flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-r text-white shadow-xl transition-all hover:scale-105 active:scale-95', gradientFrom, gradientTo, shadowColor)}>
            {playing ? <Pause className="h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" /> : <Play className="ml-1 h-6 w-6 sm:h-7 sm:w-7" fill="currentColor" />}
          </button>
          <button onClick={onNext} className="p-2 text-gray-300 hover:text-white transition hover:scale-110 active:scale-95">
            <SkipForward className="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" />
          </button>
          <div className="relative">
            <button onClick={() => setShowSpeed(!showSpeed)}
              className={cn('p-2 rounded-lg transition-all', speed !== 1 ? cn(textAccent, repeatBg) : 'text-gray-500 hover:text-white hover:bg-white/5')}>
              <Gauge className="h-4 w-4" />
            </button>
            {speed !== 1 && (
              <span className={cn('absolute -top-1 -right-1 h-3.5 min-w-[14px] px-0.5 flex items-center justify-center rounded-full text-[7px] font-bold text-white bg-gradient-to-r', gradientFrom, gradientTo)}>
                {speed}x
              </span>
            )}
            {showSpeed && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-xl bg-gray-900/95 border border-white/10 backdrop-blur-xl shadow-2xl p-1.5 min-w-[120px] z-50">
                <p className="text-[8px] uppercase tracking-wider text-white/30 px-2 py-1 font-semibold">Speed</p>
                {SPEEDS.map(r => (
                  <button key={r} onClick={() => { setSpeed(r); setShowSpeed(false); }}
                    className={cn('w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors',
                      speed === r ? cn(speedBg, speedText, 'font-medium') : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )}>
                    {r}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Volume control - ALWAYS VISIBLE */}
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 sm:px-4 py-2.5 sm:py-3">
          <button onClick={toggleMute} className="text-gray-400 hover:text-white transition shrink-0">
            <VolumeIcon className="h-5 w-5" />
          </button>
          <div className="relative flex-1 h-2 rounded-full bg-white/10 cursor-pointer">
            <div className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r', volGrad)} style={{ width: `${volPct}%` }} />
            <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={handleVolumeChange}
              className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
            <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-md pointer-events-none transition-all"
              style={{ left: `calc(${volPct}% - 8px)` }} />
          </div>
          <span className="text-[11px] tabular-nums text-gray-400 w-8 text-right shrink-0 font-medium">
            {Math.round(volPct)}%
          </span>
        </div>
      </div>
    </div>
  );
}
