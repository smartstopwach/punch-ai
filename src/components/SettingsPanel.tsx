import { Settings, Difficulty } from '../types';

interface SettingsPanelProps {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  return (
    <div className="fixed inset-0 z-50 bg-[#07080A]/80 backdrop-blur-[16px] flex items-center justify-center p-6">
      <div className="w-full max-w-[560px] border border-white/[0.08] bg-[#0F1012] max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="sticky top-0 bg-[#0F1012] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div>
            <div className="mono text-[11px] tracking-[0.2em] text-white/30">CONFIGURATION</div>
            <div className="text-[18px] font-semibold tracking-[-0.02em]">SETTINGS</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 border border-white/10 hover:bg-white/5">✕</button>
        </div>

        <div className="p-6 space-y-8">
          {/* Camera */}
          <section>
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-4">CAMERA & PRIVACY</div>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <div className="text-[13px]">Privacy Mode</div>
                  <div className="mono text-[10px] text-white/40 mt-0.5">Hide raw camera feed, show silhouette only</div>
                </div>
                <input type="checkbox" checked={settings.privacyMode} onChange={e => update({ privacyMode: e.target.checked })} className="accent-[#E8FF2A]" />
              </label>
              <label className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06]">
                <div>
                  <div className="text-[13px]">Mirror Camera</div>
                  <div className="mono text-[10px] text-white/40 mt-0.5">Flip preview horizontally</div>
                </div>
                <input type="checkbox" checked={settings.mirrorCamera} onChange={e => update({ mirrorCamera: e.target.checked })} className="accent-[#E8FF2A]" />
              </label>
            </div>
          </section>

          {/* Audio */}
          <section>
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-4">AUDIO & HAPTICS</div>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[13px]">Sound Enabled</span>
                <input type="checkbox" checked={settings.soundEnabled} onChange={e => update({ soundEnabled: e.target.checked })} className="accent-[#E8FF2A]" />
              </label>
              <label className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06]">
                <span className="text-[13px]">Haptics (where supported)</span>
                <input type="checkbox" checked={settings.haptics} onChange={e => update({ haptics: e.target.checked })} className="accent-[#E8FF2A]" />
              </label>
            </div>
          </section>

          {/* Graphics */}
          <section>
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-4">GRAPHICS</div>
            <div className="grid grid-cols-2 gap-2">
              {(['low','medium','high','ultra'] as const).map(q => (
                <button key={q} onClick={() => update({ graphicsQuality: q })} className={`p-3 border mono text-[11px] tracking-[0.1em] uppercase ${settings.graphicsQuality===q ? 'bg-[#E8FF2A] text-black border-[#E8FF2A]' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] text-white/70'}`}>{q}</button>
              ))}
            </div>
          </section>

          {/* Difficulty */}
          <section>
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-4">DIFFICULTY</div>
            <div className="grid grid-cols-2 gap-2">
              {(['beginner','intermediate','advanced','expert'] as Difficulty[]).map(d => (
                <button key={d} onClick={() => update({ difficulty: d })} className={`p-3 border mono text-[11px] tracking-[0.1em] uppercase ${settings.difficulty===d ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] text-white/70'}`}>{d}</button>
              ))}
            </div>
            <div className="mono text-[10px] text-white/30 mt-3 leading-[1.4]">
              Affects target size, reaction window, combo complexity. Does not encourage unsafe exertion.
            </div>
          </section>

          {/* Accessibility */}
          <section>
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-4">ACCESSIBILITY</div>
            <label className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/[0.06]">
              <div>
                <div className="text-[13px]">Reduced Motion</div>
                <div className="mono text-[10px] text-white/40 mt-0.5">Minimize animations and parallax</div>
              </div>
              <input type="checkbox" checked={settings.reducedMotion} onChange={e => update({ reducedMotion: e.target.checked })} className="accent-[#E8FF2A]" />
            </label>
          </section>

          {/* Target size */}
          <section>
            <div className="mono text-[11px] tracking-[0.15em] text-white/40 mb-4">TARGET SIZE: {settings.targetSize.toFixed(1)}x</div>
            <input type="range" min={0.7} max={1.4} step={0.1} value={settings.targetSize} onChange={e => update({ targetSize: parseFloat(e.target.value) })} className="w-full accent-[#E8FF2A]" />
          </section>

          <div className="pt-6 border-t border-white/[0.06] mono text-[10px] leading-[1.6] text-white/30">
            Camera processing happens locally on your device. No video is uploaded. Derived metrics only are stored in localStorage unless you enable cloud sync (future).<br /><br />
            Estimated Power is camera-based and NOT a real force measurement in Newtons. Future hardware sensors can provide calibrated force.
          </div>
        </div>
      </div>
    </div>
  );
}
