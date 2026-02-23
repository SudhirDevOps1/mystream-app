import { useState, useMemo, useCallback } from 'react';
import { Play, Film, Music2, Mic2, Star, Eye, Clock, Search, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber, getThumbnail } from '@/types';
import type { MediaItem, SectionType } from '@/types';

interface GalleryItem extends MediaItem {
  mediaType: 'video' | 'music' | 'podcast';
  originalIndex: number;
}

interface GalleryProps {
  videos: MediaItem[];
  music: MediaItem[];
  podcasts: MediaItem[];
  onNavigate: (section: SectionType, index: number) => void;
  activeVideoIdx: number;
  activeMusicIdx: number;
  activePodcastIdx: number;
}

const typeFilters = [
  { id: 'all', label: 'All', icon: null },
  { id: 'video', label: 'Videos', icon: Film },
  { id: 'music', label: 'Music', icon: Music2 },
  { id: 'podcast', label: 'Podcasts', icon: Mic2 },
] as const;

// Thumbnail component with fallback
function Thumbnail({ src, alt, icon: Icon, gradient, className }: {
  src: string | null;
  alt: string;
  icon: typeof Film;
  gradient: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Gradient fallback / loading background */}
      <div className={cn('absolute inset-0 flex items-center justify-center bg-gradient-to-br', gradient)}>
        <Icon className={cn('h-10 w-10 sm:h-12 sm:w-12 transition-opacity duration-300', imgLoaded && !imgError ? 'opacity-0' : 'opacity-30 text-white')} />
      </div>

      {/* Actual image with lazy loading */}
      {src && !imgError && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-all duration-500',
            imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          )}
        />
      )}
    </div>
  );
}

export function Gallery({ videos, music, podcasts, onNavigate, activeVideoIdx, activeMusicIdx, activePodcastIdx }: GalleryProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'music' | 'podcast'>('all');

  const allItems: GalleryItem[] = useMemo(() => {
    const items: GalleryItem[] = [];
    videos.forEach((v, i) => items.push({ ...v, mediaType: 'video', originalIndex: i }));
    music.forEach((m, i) => items.push({ ...m, mediaType: 'music', originalIndex: i }));
    podcasts.forEach((p, i) => items.push({ ...p, mediaType: 'podcast', originalIndex: i }));
    return items;
  }, [videos, music, podcasts]);

  const filtered = useMemo(() => {
    return allItems.filter(item => {
      const matchType = typeFilter === 'all' || item.mediaType === typeFilter;
      const q = search.toLowerCase();
      const matchSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        (item.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (item.author || '').toLowerCase().includes(q) ||
        (item.host || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [allItems, search, typeFilter]);

  const isActive = useCallback((item: GalleryItem) => {
    if (item.mediaType === 'video') return item.originalIndex === activeVideoIdx;
    if (item.mediaType === 'music') return item.originalIndex === activeMusicIdx;
    return item.originalIndex === activePodcastIdx;
  }, [activeVideoIdx, activeMusicIdx, activePodcastIdx]);

  const handleClick = useCallback((item: GalleryItem) => {
    const sectionMap: Record<string, SectionType> = { video: 'video', music: 'music', podcast: 'podcast' };
    onNavigate(sectionMap[item.mediaType], item.originalIndex);
  }, [onNavigate]);

  const typeColors: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    video: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30', gradient: 'from-violet-600 to-indigo-600' },
    music: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', gradient: 'from-emerald-600 to-teal-600' },
    podcast: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', gradient: 'from-rose-600 to-pink-600' },
  };

  const TypeIcon = (type: string) => {
    if (type === 'video') return Film;
    if (type === 'music') return Music2;
    return Mic2;
  };

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <ImageIcon className="h-5 w-5 text-amber-400" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Media Gallery</h2>
            <p className="text-xs text-gray-500 mt-0.5">Browse all your content in one place</p>
          </div>
          <span className="ml-auto rounded-full bg-gray-800/80 border border-white/[0.06] px-3 py-1 text-xs text-gray-400 font-medium">
            {filtered.length} items
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Search videos, music, podcasts..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 sm:py-3 pl-10 pr-10 text-sm text-white placeholder-gray-500 outline-none focus:border-amber-500/30 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white rounded-full hover:bg-white/10 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {typeFilters.map(f => (
            <button key={f.id} onClick={() => setTypeFilter(f.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                typeFilter === f.id
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-sm'
                  : 'border border-white/[0.06] text-gray-400 hover:border-white/15 hover:text-gray-200 hover:bg-white/[0.04]'
              )}
            >
              {f.icon && <f.icon className="h-3.5 w-3.5" />}
              {f.label}
              <span className="ml-1 text-[10px] opacity-60">
                ({f.id === 'all' ? allItems.length : allItems.filter(i => i.mediaType === f.id).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Search className="mb-3 h-12 w-12 opacity-30" />
          <p className="text-base font-medium">No results found</p>
          <p className="text-xs text-gray-600 mt-1">Try different search terms or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filtered.map(item => {
            const active = isActive(item);
            const colors = typeColors[item.mediaType];
            const Icon = TypeIcon(item.mediaType);
            const thumbUrl = getThumbnail(item);

            return (
              <button
                key={`${item.mediaType}-${item.id}`}
                onClick={() => handleClick(item)}
                className={cn(
                  'card-hover group text-left rounded-2xl border overflow-hidden transition-all duration-300',
                  active
                    ? cn(colors.border, colors.bg, 'ring-1', colors.border)
                    : 'border-white/[0.06] bg-gray-900/50 hover:bg-gray-900/80 hover:border-white/10'
                )}
              >
                {/* Thumbnail area with overlays */}
                <div className="relative aspect-video w-full overflow-hidden">
                  <Thumbnail
                    src={thumbUrl}
                    alt={item.title}
                    icon={Icon}
                    gradient={colors.gradient}
                    className="absolute inset-0"
                  />

                  {/* Play hover overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/25 backdrop-blur-sm transform scale-75 group-hover:scale-100 transition-transform duration-200">
                      <Play className="ml-0.5 h-5 w-5 text-white" fill="white" />
                    </div>
                  </div>

                  {/* Type badge */}
                  <span className={cn('absolute top-2 left-2 z-10 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm border', colors.bg, colors.text, colors.border)}>
                    {item.mediaType}
                  </span>

                  {/* Duration */}
                  {item.duration && (
                    <span className="absolute bottom-2 right-2 z-10 rounded-md bg-black/70 backdrop-blur-sm px-1.5 py-0.5 text-[10px] text-white/90 font-medium">
                      {item.duration}
                    </span>
                  )}

                  {/* Playing indicator */}
                  {active && (
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-sm px-2 py-1">
                      <div className="flex items-end gap-[2px] h-3">
                        {[0, 100, 200, 150].map((d, i) => (
                          <div key={i} className={cn('w-[2px] rounded-full', colors.text)}
                            style={{ animation: `eq-bounce 0.8s ease-in-out ${d}ms infinite`, height: '100%' }} />
                        ))}
                      </div>
                      <span className="text-[9px] text-white/80 font-medium ml-0.5">PLAYING</span>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-3 sm:p-3.5">
                  <h3 className={cn(
                    'font-semibold text-sm truncate transition-colors',
                    active ? 'text-white' : 'text-gray-200 group-hover:text-white'
                  )}>
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-gray-500 truncate mt-1">{item.description}</p>

                  {/* Author/Host */}
                  {(item.author || item.host) && (
                    <p className="text-[10px] text-gray-600 mt-1 truncate">
                      by {item.author || item.host}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {item.category && (
                      <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-medium', active ? cn(colors.bg, colors.text) : 'bg-white/5 text-gray-500')}>
                        {item.category}
                      </span>
                    )}
                    {item.rating && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                        <Star className="h-2.5 w-2.5" fill="currentColor" />{item.rating}
                      </span>
                    )}
                    {(item.views || item.plays) && (
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                        <Eye className="h-2.5 w-2.5" />{formatNumber(item.views || item.plays || 0)}
                      </span>
                    )}
                    {item.duration && (
                      <span className="flex items-center gap-0.5 text-[10px] text-gray-600">
                        <Clock className="h-2.5 w-2.5" />{item.duration}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="rounded-full bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 text-[9px] text-gray-500">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
