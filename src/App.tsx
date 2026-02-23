import { useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { VideoPlayer } from '@/components/VideoPlayer';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Playlist } from '@/components/Playlist';
import { Gallery } from '@/components/Gallery';
import { Star, Eye, Calendar, User, Play, Clock, Mic2, Film, Music2 } from 'lucide-react';
import { formatNumber } from '@/types';
import type { SectionType, MediaItem } from '@/types';
import mediaData from '@/data/media.json';

function InfoCard({ item, accentColor }: { item: MediaItem; accentColor: 'violet' | 'emerald' | 'rose' }) {
  const tagColors = {
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400/80', catBg: 'bg-violet-500/15', catBorder: 'border-violet-500/20', catText: 'text-violet-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400/80', catBg: 'bg-emerald-500/15', catBorder: 'border-emerald-500/20', catText: 'text-emerald-400' },
    rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400/80', catBg: 'bg-rose-500/15', catBorder: 'border-rose-500/20', catText: 'text-rose-400' },
  }[accentColor];

  return (
    <div className="mt-3 sm:mt-4 rounded-2xl border border-white/[0.06] bg-gray-900/50 backdrop-blur-sm p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-white">{item.title}</h3>
          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-gray-400">{item.description}</p>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mt-3">
            {(item.author || item.host) && (
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <User className="h-3 w-3" />{item.author || item.host}
              </span>
            )}
            {item.rating && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <Star className="h-3 w-3" fill="currentColor" />{item.rating}
              </span>
            )}
            {(item.views || item.plays) && (
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Eye className="h-3 w-3" />{formatNumber(item.views || item.plays || 0)} {item.views ? 'views' : 'plays'}
              </span>
            )}
            {item.publish_date && (
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                <Calendar className="h-3 w-3" />{item.publish_date}
              </span>
            )}
          </div>
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {item.tags.map(tag => (
                <span key={tag} className={`rounded-full ${tagColors.bg} border ${tagColors.border} px-2 py-0.5 text-[10px] ${tagColors.text}`}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {item.category && (
          <span className={`shrink-0 self-start rounded-lg ${tagColors.catBg} border ${tagColors.catBorder} px-3 py-1.5 text-xs font-semibold ${tagColors.catText}`}>
            {item.category}
          </span>
        )}
      </div>
    </div>
  );
}

export function App() {
  const [activeSection, setActiveSection] = useState<SectionType>('video');
  const [videoIdx, setVideoIdx] = useState(0);
  const [musicIdx, setMusicIdx] = useState(0);
  const [podcastIdx, setPodcastIdx] = useState(0);

  const videos = mediaData.videos;
  const music = mediaData.music;
  const podcasts = mediaData.podcasts;

  const currentVideo = videos[videoIdx];
  const currentMusic = music[musicIdx];
  const currentPodcast = podcasts[podcastIdx];

  // Navigation callbacks
  const nextVideo = useCallback(() => setVideoIdx(p => (p + 1) % videos.length), [videos.length]);
  const prevVideo = useCallback(() => setVideoIdx(p => (p - 1 + videos.length) % videos.length), [videos.length]);
  const nextMusic = useCallback(() => setMusicIdx(p => (p + 1) % music.length), [music.length]);
  const prevMusic = useCallback(() => setMusicIdx(p => (p - 1 + music.length) % music.length), [music.length]);
  const nextPodcast = useCallback(() => setPodcastIdx(p => (p + 1) % podcasts.length), [podcasts.length]);
  const prevPodcast = useCallback(() => setPodcastIdx(p => (p - 1 + podcasts.length) % podcasts.length), [podcasts.length]);

  // Gallery navigation
  const handleGalleryNavigate = useCallback((section: SectionType, index: number) => {
    setActiveSection(section);
    if (section === 'video') setVideoIdx(index);
    else if (section === 'music') setMusicIdx(index);
    else if (section === 'podcast') setPodcastIdx(index);
  }, []);

  // Section accent colors
  const sectionGlow = {
    video: 'bg-violet-600/10',
    music: 'bg-emerald-600/10',
    gallery: 'bg-amber-600/10',
    podcast: 'bg-rose-600/10',
  }[activeSection];

  const sectionGlow2 = {
    video: 'bg-indigo-600/8',
    music: 'bg-teal-600/8',
    gallery: 'bg-orange-600/8',
    podcast: 'bg-pink-600/8',
  }[activeSection];

  const sectionBar = {
    video: 'from-violet-500 to-indigo-500',
    music: 'from-emerald-500 to-teal-500',
    gallery: 'from-amber-400 to-orange-500',
    podcast: 'from-rose-500 to-pink-500',
  }[activeSection];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Background ambience */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className={`absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-[160px] transition-colors duration-1000 ${sectionGlow}`} />
        <div className={`absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full blur-[160px] transition-colors duration-1000 ${sectionGlow2}`} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header activeSection={activeSection} onSectionChange={setActiveSection} />

        <main className="flex-1 mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 pb-20 md:pb-6">

          {/* ============ VIDEO SECTION ============ */}
          {activeSection === 'video' && (
            <div className="animate-fade-in-up">
              <div className="mb-4 sm:mb-5 flex items-center gap-3">
                <div className={`h-8 w-1 rounded-full bg-gradient-to-b ${sectionBar}`} />
                <Film className="h-5 w-5 text-violet-400" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Video Player</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Now Playing: {currentVideo?.title}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr,320px] xl:grid-cols-[1fr,360px]">
                <div className="min-w-0">
                  {currentVideo && (
                    <VideoPlayer
                      item={currentVideo}
                      onEnded={nextVideo}
                      onNext={nextVideo}
                      onPrev={prevVideo}
                    />
                  )}
                  {currentVideo && <InfoCard item={currentVideo} accentColor="violet" />}
                </div>
                <div className="lg:max-h-[calc(100vh-120px)] lg:overflow-hidden">
                  <Playlist
                    items={videos}
                    currentIndex={videoIdx}
                    onSelect={setVideoIdx}
                    accentColor="violet"
                    title="Video Playlist"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============ MUSIC SECTION ============ */}
          {activeSection === 'music' && (
            <div className="animate-fade-in-up">
              <div className="mb-4 sm:mb-5 flex items-center gap-3">
                <div className={`h-8 w-1 rounded-full bg-gradient-to-b ${sectionBar}`} />
                <Music2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Music Player</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Now Playing: {currentMusic?.title}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr,320px] xl:grid-cols-[1fr,360px]">
                <div className="min-w-0">
                  {currentMusic && (
                    <AudioPlayer
                      item={currentMusic}
                      onEnded={nextMusic}
                      onNext={nextMusic}
                      onPrev={prevMusic}
                      accentColor="emerald"
                    />
                  )}
                  {currentMusic && <InfoCard item={currentMusic} accentColor="emerald" />}

                  {/* Up Next */}
                  {music.length > 1 && (
                    <div className="mt-3 sm:mt-4 rounded-2xl border border-white/[0.06] bg-gray-900/50 backdrop-blur-sm p-4">
                      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Up Next</h4>
                      <div className="space-y-1">
                        {[1, 2].filter(o => o < music.length).map(offset => {
                          const idx = (musicIdx + offset) % music.length;
                          const m = music[idx];
                          return (
                            <button
                              key={m.id}
                              onClick={() => setMusicIdx(idx)}
                              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] group"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[10px] text-gray-500 font-bold group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                                {offset}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{m.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {m.duration && <span className="flex items-center gap-0.5 text-[9px] text-gray-600"><Clock className="h-2.5 w-2.5" />{m.duration}</span>}
                                  {m.category && <span className="text-[9px] text-gray-600">{m.category}</span>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:max-h-[calc(100vh-120px)] lg:overflow-hidden">
                  <Playlist
                    items={music}
                    currentIndex={musicIdx}
                    onSelect={setMusicIdx}
                    accentColor="emerald"
                    title="Music Playlist"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ============ GALLERY SECTION ============ */}
          {activeSection === 'gallery' && (
            <Gallery
              videos={videos}
              music={music}
              podcasts={podcasts}
              onNavigate={handleGalleryNavigate}
              activeVideoIdx={videoIdx}
              activeMusicIdx={musicIdx}
              activePodcastIdx={podcastIdx}
            />
          )}

          {/* ============ PODCAST SECTION ============ */}
          {activeSection === 'podcast' && (
            <div className="animate-fade-in-up">
              <div className="mb-4 sm:mb-5 flex items-center gap-3">
                <div className={`h-8 w-1 rounded-full bg-gradient-to-b ${sectionBar}`} />
                <Mic2 className="h-5 w-5 text-rose-400" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Podcast Player</h2>
                  <p className="text-[11px] text-gray-500 mt-0.5">Now Listening: {currentPodcast?.title}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr,320px] xl:grid-cols-[1fr,360px]">
                <div className="min-w-0">
                  {currentPodcast && (
                    <AudioPlayer
                      item={currentPodcast}
                      onEnded={nextPodcast}
                      onNext={nextPodcast}
                      onPrev={prevPodcast}
                      accentColor="rose"
                      icon={<Mic2 className="h-6 w-6 sm:h-7 sm:w-7 text-white" />}
                    />
                  )}
                  {currentPodcast && <InfoCard item={currentPodcast} accentColor="rose" />}

                  {/* Up Next */}
                  {podcasts.length > 1 && (
                    <div className="mt-3 sm:mt-4 rounded-2xl border border-white/[0.06] bg-gray-900/50 backdrop-blur-sm p-4">
                      <h4 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Up Next</h4>
                      <div className="space-y-1">
                        {[1, 2].filter(o => o < podcasts.length).map(offset => {
                          const idx = (podcastIdx + offset) % podcasts.length;
                          const p = podcasts[idx];
                          return (
                            <button
                              key={p.id}
                              onClick={() => setPodcastIdx(idx)}
                              className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] group"
                            >
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-[10px] text-gray-500 font-bold group-hover:bg-rose-500/20 group-hover:text-rose-400 transition-colors">
                                {offset}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{p.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {p.host && <span className="flex items-center gap-0.5 text-[9px] text-gray-600"><User className="h-2.5 w-2.5" />{p.host}</span>}
                                  {p.duration && <span className="flex items-center gap-0.5 text-[9px] text-gray-600"><Clock className="h-2.5 w-2.5" />{p.duration}</span>}
                                </div>
                              </div>
                              <Play className="h-3 w-3 text-gray-600 group-hover:text-rose-400 transition-colors shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:max-h-[calc(100vh-120px)] lg:overflow-hidden">
                  <Playlist
                    items={podcasts}
                    currentIndex={podcastIdx}
                    onSelect={setPodcastIdx}
                    accentColor="rose"
                    title="Podcast Episodes"
                  />
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] bg-gray-950/80 backdrop-blur-sm py-4 mt-auto hidden md:block">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-600">© 2024 StreamVault. All rights reserved.</p>
              <p className="text-[10px] text-gray-600">
                Edit <code className="rounded bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 text-gray-400">media.json</code> to manage content
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
