import { HolographicButton } from '@jarvis/ui';
import { useWorkspace, type AmbientSettings } from '../workspace';

const TOGGLES: ReadonlyArray<{ key: Exclude<keyof AmbientSettings, 'intensity'>; label: string }> =
  [
    { key: 'particles', label: 'Particles' },
    { key: 'grid', label: 'Floor grid' },
    { key: 'panels', label: '3D panels' },
    { key: 'scanlines', label: 'Scanlines' },
    { key: 'drift', label: 'Camera drift' },
  ];

/** Live controls for the workspace's ambient effects. */
export function AmbientWindow() {
  const ambient = useWorkspace((state) => state.ambient);
  const setAmbient = useWorkspace((state) => state.setAmbient);
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3">
      <div className="grid grid-cols-2 gap-1.5">
        {TOGGLES.map(({ key, label }) => (
          <HolographicButton
            key={key}
            size="xs"
            active={ambient[key]}
            onClick={() => setAmbient({ [key]: !ambient[key] })}
          >
            {label}
          </HolographicButton>
        ))}
      </div>
      <label className="block">
        <span className="holo-label flex justify-between">
          <span>Intensity</span>
          <span className="text-readout">{Math.round(ambient.intensity * 100)}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(ambient.intensity * 100)}
          onChange={(event) => setAmbient({ intensity: Number(event.target.value) / 100 })}
          className="mt-2 w-full accent-holo-400"
        />
      </label>
      <p className="text-[12px] leading-snug text-holo-300/55">
        Effects also follow the global quality tier (Q in the top bar) and the reduced-motion
        setting.
      </p>
    </div>
  );
}
