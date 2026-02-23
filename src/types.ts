export interface MediaItem {
  id: string;
  title: string;
  description: string;
  link: string;
  thumbnail?: string;
  duration?: string;
  category?: string;
  rating?: number;
  views?: number;
  plays?: number;
  publish_date?: string;
  author?: string;
  host?: string;
  tags?: string[];
  cover?: string;
}

export interface MediaData {
  videos: MediaItem[];
  music: MediaItem[];
  podcasts: MediaItem[];
}

export type SectionType = 'video' | 'music' | 'gallery' | 'podcast';

export function isYouTubeLink(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

export function getYouTubeEmbedUrl(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : url;
}

export function getYouTubeVideoId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}

export function getYouTubeThumbnail(url: string): string | null {
  const id = getYouTubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// Get thumbnail for any media item
export function getThumbnail(item: MediaItem): string | null {
  if (item.thumbnail) return item.thumbnail;
  if (isYouTubeLink(item.link)) return getYouTubeThumbnail(item.link);
  return null;
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ━━━ MEGA.NZ SUPPORT ━━━
export function isMegaLink(url: string): boolean {
  return /mega\.nz/i.test(url);
}

export function getMegaEmbedUrl(url: string, _mode: 'video' | 'audio' = 'video'): string {
  // Already an embed link — use as-is
  if (url.includes('mega.nz/embed/')) return url;
  // Convert file link: mega.nz/file/ID#KEY → mega.nz/embed/ID#KEY
  if (url.includes('mega.nz/file/')) {
    return url.replace('mega.nz/file/', 'mega.nz/embed/');
  }
  // If it's some other mega link format, try embedding as-is
  return url;
}

// Detect link type for display purposes
export function getLinkType(url: string): 'youtube' | 'mega' | 'direct' {
  if (isYouTubeLink(url)) return 'youtube';
  if (isMegaLink(url)) return 'mega';
  return 'direct';
}
