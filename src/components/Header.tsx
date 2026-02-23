import { Film, Music2, Image, Mic2, Radio } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SectionType } from '@/types';

interface HeaderProps {
  activeSection: SectionType;
  onSectionChange: (s: SectionType) => void;
}

const navItems: { id: SectionType; label: string; icon: typeof Film; grad: string; active: string; shadow: string }[] = [
  { id: 'video', label: 'Videos', icon: Film, grad: 'from-violet-600 to-indigo-600', active: 'text-violet-400', shadow: 'shadow-violet-500/30' },
  { id: 'music', label: 'Music', icon: Music2, grad: 'from-emerald-600 to-teal-600', active: 'text-emerald-400', shadow: 'shadow-emerald-500/30' },
  { id: 'gallery', label: 'Gallery', icon: Image, grad: 'from-amber-500 to-orange-600', active: 'text-amber-400', shadow: 'shadow-amber-500/30' },
  { id: 'podcast', label: 'Podcasts', icon: Mic2, grad: 'from-rose-600 to-pink-600', active: 'text-rose-400', shadow: 'shadow-rose-500/30' },
];

export function Header({ activeSection, onSectionChange }: HeaderProps) {
  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-gray-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 shadow-lg shadow-violet-500/25">
              <Radio className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                Stream<span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Vault</span>
              </h1>
              <p className="hidden sm:block text-[10px] text-gray-500 leading-none">Stream Everything</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-white/[0.04] p-1.5 border border-white/[0.06]">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300',
                  activeSection === item.id
                    ? `bg-gradient-to-r ${item.grad} text-white shadow-lg ${item.shadow}`
                    : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile section label */}
          <div className="md:hidden">
            <span className={cn(
              'text-sm font-semibold capitalize',
              navItems.find(n => n.id === activeSection)?.active
            )}>
              {activeSection}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/[0.08] bg-gray-950/95 backdrop-blur-2xl pb-safe">
        <div className="flex items-center justify-around px-1 py-1">
          {navItems.map(item => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200 min-w-[56px]',
                  isActive ? 'scale-105' : 'opacity-60'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center rounded-lg p-1.5 transition-all',
                  isActive ? `bg-gradient-to-r ${item.grad} shadow-md ${item.shadow}` : ''
                )}>
                  <item.icon className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-white' : 'text-gray-400'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium transition-colors leading-tight',
                  isActive ? item.active : 'text-gray-500'
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
