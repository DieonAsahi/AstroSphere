import { useState } from 'react';
import { Chip } from '../../ui/Chip';
import { GlassPanel } from '../../ui/GlassPanel';
import { HudLabel } from '../../ui/HudLabel';
import { IconButton } from '../../ui/IconButton';
import { Kbd } from '../../ui/Kbd';
import { Slider } from '../../ui/Slider';
import { TabList } from '../../ui/TabList';
import { Toggle } from '../../ui/Toggle';

export function StylesPage() {
  const [tab, setTab] = useState('benda');
  const [slider, setSlider] = useState(5);
  const [toggle, setToggle] = useState(true);

  return (
    <main className="styles-page">
      <h1 className="mb-6 text-[var(--font-size-xl)]">
        Direktori gaya AstroSphere
      </h1>
      <div className="styles-grid">
        <GlassPanel className="p-5">
          <h2>Panel kaca</h2>
          <p className="mt-3 text-[var(--color-text-secondary)]">
            Lapisan observatorium dengan kontras tinggi.
          </p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h2>Chip dan nilai</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>Mars</Chip>
            <HudLabel label="Jarak Matahari" value="227.94" unit="juta km" />
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h2>Tab</h2>
          <div className="mt-3">
            <TabList
              label="Kategori eksplorasi"
              options={[
                { id: 'benda', label: 'Benda langit' },
                { id: 'poi', label: 'POI' },
                { id: 'fenomena', label: 'Fenomena' },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h2>Kontrol</h2>
          <div className="mt-3 flex items-center gap-3">
            <IconButton
              label="Reset kamera"
              icon={<span aria-hidden="true">↺</span>}
            />
            <Toggle
              label="Kurangi animasi"
              checked={toggle}
              onChange={(event) => setToggle(event.target.checked)}
            />
          </div>
          <label className="mt-4 block">
            Kecepatan orbit
            <Slider
              aria-label="Kecepatan orbit"
              min={0}
              max={10}
              value={slider}
              onChange={(event) => setSlider(Number(event.target.value))}
            />
          </label>
        </GlassPanel>
        <GlassPanel className="p-5">
          <h2>Pintasan</h2>
          <div className="mt-3 flex gap-2">
            <Kbd>Space</Kbd>
            <Kbd>+</Kbd>
            <Kbd>-</Kbd>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
