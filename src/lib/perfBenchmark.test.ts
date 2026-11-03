import { describe, expect, it } from 'vitest';
import { benchmarkParticleStormTiers } from './perfBenchmark';

describe('Performance Benchmark & Resource Profiling', () => {
  it('measures metrics across high, mid, and low quality tiers', () => {
    const results = benchmarkParticleStormTiers();
    expect(results).toHaveLength(3);

    const [high, mid, low] = results;

    // Kualitas Tinggi
    expect(high.tier).toBe('high');
    expect(high.particleCount).toBe(40000);
    expect(high.bufferSizeMB).toBeCloseTo(1.22, 1);
    expect(high.drawCalls).toBe(1);
    expect(high.estimatedFps).toBeGreaterThanOrEqual(30);

    // Kualitas Sedang
    expect(mid.tier).toBe('mid');
    expect(mid.particleCount).toBe(15000);
    expect(mid.bufferSizeMB).toBeCloseTo(0.46, 1);
    expect(mid.drawCalls).toBe(1);
    expect(mid.estimatedFps).toBeGreaterThanOrEqual(45);

    // Kualitas Rendah
    expect(low.tier).toBe('low');
    expect(low.particleCount).toBe(4000);
    expect(low.bufferSizeMB).toBeCloseTo(0.12, 1);
    expect(low.drawCalls).toBe(1);
    expect(low.estimatedFps).toBeGreaterThanOrEqual(55);

    console.info('=== HASIL BENCHMARK PARTICLE STORM ===');
    console.table(results);
  });
});
