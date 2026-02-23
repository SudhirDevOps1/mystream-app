import { useState, useMemo } from 'react';
import { Search, Play, Clock, Tag, Star, Eye, User, X, Film, Music2, Mic2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber, getThumbnail } from '@/types';
import type { MediaItem } from '@/types';

interface PlaylistProps {
  items: MediaItem[];
  currentIndex: number;
  onSelect: (index: number) => void;
  accentColor: 'violet' | 'emerald' | 'rose';
  title: string;
}

// Small thumbnail with fallback
function SmallThumb({ item, accentColor, isActive }: { item: MediaItem; accentColor: string; isActive: boolean }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const thumbUrl = getThumbnail(item);

  const gradients: Record<string, string> = {
    violet: 'from-violet-600 to-indigo-600',
    emerald: 'from-emerald-600 to-teal-600',
    rose: 'from-rose-600 to-pink-600',
  };

  const icons: Record<string, typeof Film> = {
    violet: Film,
    emerald: Music2,
    rose: Mic2,
  };

  const Icon = icons[accentColor] || Film;

  return (
    <div className={cn(
      'relative h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-lg overflow-hidden',
      isActive && 'ring-2 ring-white/20'
    )}>
      {/* Gradient fallback */}
      <div className={cn('absolute inset-0 flex items-center justify-center bg-gradient-to-br', gradients[accentColor])}>
        <Icon className={cn('h-4 w-4 transition-opacity', thumbUrl && imgLoaded && !imgError ? 'opacity-0' : 'opacity-50 text-white')} />
      </div>
      {thumbUrl && !imgError && (
        <img
          src={thumbUrl}
          alt={item.title}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            imgLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
      {/* Play overlay on hover */}
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/item:opacity-100 transition-opacity">
          <Play className="h-3 w-3 text-white" fill="white" />
        </div>
      )}
    </div>
  );
}

export function Playlist({ items, currentIndex, onSelect, accentColor, title }: PlaylistProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter((c): c is string => !!c));
    return ['All', ...Array.from(cats)];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.tags || []).some(t => t.toLowerCase().includes(q)) ||
        (item.author || '').toLowerCase().includes(q) ||
        (item.host || '').toLowerCase().includes(q);
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [items, search, selectedCategory]);

  const colors = {
    violet: {
      gradFrom: 'from-violet-500', gradTo: 'to-indigo-500',
      text: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/20',
      ring: 'ring-violet-500/20', focus: 'focus:ring-violet-500/30',
      bar: 'bg-violet-400', catActive: 'bg-violet-500/15 border-violet-500/20 text-violet-300'
    },
    emerald: {
      gradFrom: 'from-emerald-500', gradTo: 'to-teal-500',
      text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20',
      ring: 'ring-emerald-500/20', focus: 'focus:ring-emerald-500/30',
      bar: 'bg-emerald-400', catActive: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-300'
    },
    rose: {
      gradFrom: 'from-rose-500', gradTo: 'to-pink-500',
      text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/20',
      ring: 'ring-rose-500/20', focus: 'focus:ring-rose-500/30',
      bar: 'bg-rose-400', catActive: 'bg-rose-500/15 border-rose-500/20 text-rose-300'
    },
  }[accentColor];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-gray-900/60 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-white/[0.06] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-semibold text-white">{title}</h2>
          <span className="rounded-full bg-gray-800/80 border border-white/[0.06] px-2 py-0.5 text-[10px] text-gray-400">
            {filtered.length}/{items.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Search..."
            value={search} onChange={e => setSearch(e.target.value)}
            className={cn('w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-8 text-xs text-white placeholder-gray-500 outline-none transition-all focus:ring-2', colors.focus)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Categories */}
        {categories.length > 2 && (
          <div className="flex flex-wrap gap-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium border transition-all',
                  selectedCategory === cat
                    ? colors.catActive
                    : 'border-white/[0.06] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                )}
              >
                <Tag className="h-2.5 w-2.5" />{cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-600">
            <Search className="mb-2 h-8 w-8 opacity-40" />
            <p className="text-xs font-medium">No results</p>
          </div>
        ) : (
          <div className="p-1.5 sm:p-2">
            {filtered.map(item => {
              const idx = items.findIndex(i => i.id === item.id);
              const current = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(idx)}
                  className={cn(
                    'group/item mb-1 flex w-full items-center gap-2.5 rounded-xl p-2 sm:p-2.5 text-left transition-all duration-200',
                    current
                      ? cn('border', colors.border, colors.bg, 'ring-1', colors.ring)
                      : 'border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]'
                  )}
                >
                  {/* Thumbnail */}
                  <SmallThumb item={item} accentColor={accentColor} isActive={current} />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className={cn(
                      'truncate text-xs sm:text-sm font-semibold transition-colors',
                      current ? 'text-white' : 'text-gray-300 group-hover/item:text-white'
                    )}>
                      {item.title}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-500">{item.host || item.author || item.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {item.category && (
                        <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-medium', current ? cn(colors.text, 'bg-white/10') : 'bg-white/[0.04] text-gray-500')}>
                          {item.category}
                        </span>
                      )}
                      {item.duration && (
                        <span className="flex items-center gap-0.5 text-[9px] text-gray-600"><Clock className="h-2.5 w-2.5" />{item.duration}</span>
                      )}
                      {item.rating && (
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-500/80"><Star className="h-2.5 w-2.5" fill="currentColor" />{item.rating}</span>
                      )}
                      {(item.views || item.plays) && (
                        <span className="flex items-center gap-0.5 text-[9px] text-gray-600"><Eye className="h-2.5 w-2.5" />{formatNumber(item.views || item.plays || 0)}</span>
                      )}
                      {(item.author || item.host) && (
                        <span className="flex items-center gap-0.5 text-[9px] text-gray-600"><User className="h-2.5 w-2.5" />{item.author || item.host}</span>
                      )}
                    </div>
                  </div>

                  {/* Equalizer for active */}
                  {current && (
                    <div className="flex shrink-0 items-end gap-[2px] self-center h-4">
                      {[0, 120, 240, 80].map((delay, i) => (
                        <div key={i} className={cn('w-[2.5px] rounded-full', colors.bar)}
                          style={{ animation: `eq-bounce 0.7s ease-in-out ${delay}ms infinite`, height: '100%' }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
