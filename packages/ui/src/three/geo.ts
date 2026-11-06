import { Vector3 } from 'three';
import type { mesh as topoMesh } from 'topojson-client';

export const DEG2RAD = Math.PI / 180;

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Latitude/longitude (degrees) → point on a sphere of `radius`.
 * Longitude 0° faces +X, 90°E faces −Z; the north pole is +Y.
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius = 1,
  target = new Vector3(),
): Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lon + 180) * DEG2RAD;
  return target.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Inverse of {@link latLonToVector3}; the point's length is ignored. */
export function vector3ToLatLon(point: Vector3): LatLon {
  const length = point.length() || 1;
  const lat = 90 - Math.acos(Math.min(1, Math.max(-1, point.y / length))) / DEG2RAD;
  let lon = Math.atan2(point.z, -point.x) / DEG2RAD - 180;
  if (lon <= -180) lon += 360;
  return { lat, lon };
}

/** Y-rotation (radians) that turns `lon` towards a camera on the +Z axis. */
export function longitudeToRotationY(lon: number): number {
  return (-90 - lon) * DEG2RAD;
}

/** Unit-sphere graticule (parallels + meridians) as line-segment pairs. */
export function buildGraticule(stepDeg = 15, sampleDeg = 3): Float32Array {
  const out: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  const push = () => out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  for (let lat = -90 + stepDeg; lat < 90; lat += stepDeg) {
    for (let lon = -180; lon < 180; lon += sampleDeg) {
      latLonToVector3(lat, lon, 1, a);
      latLonToVector3(lat, lon + sampleDeg, 1, b);
      push();
    }
  }
  for (let lon = -180; lon < 180; lon += stepDeg) {
    for (let lat = -90; lat < 90; lat += sampleDeg) {
      latLonToVector3(lat, lon, 1, a);
      latLonToVector3(Math.min(90, lat + sampleDeg), lon, 1, b);
      push();
    }
  }
  return new Float32Array(out);
}

/** A single meridian (pole to pole) on the unit sphere as line-segment pairs. */
export function buildMeridian(lon: number, sampleDeg = 2): Float32Array {
  const out: number[] = [];
  const a = new Vector3();
  const b = new Vector3();
  for (let lat = -90; lat < 90; lat += sampleDeg) {
    latLonToVector3(lat, lon, 1, a);
    latLonToVector3(Math.min(90, lat + sampleDeg), lon, 1, b);
    out.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  return new Float32Array(out);
}

type Topology = Parameters<typeof topoMesh>[0];
type TopoObject = NonNullable<Parameters<typeof topoMesh>[1]>;

let coastlinePromise: Promise<Float32Array> | null = null;

/**
 * Natural Earth 1:110m land boundaries (world-atlas) as unit-sphere line segments.
 * Loaded on first use (separate chunk) and cached; a failed load can be retried.
 */
export function loadCoastlines(): Promise<Float32Array> {
  coastlinePromise ??= (async () => {
    const [{ mesh }, landModule] = await Promise.all([
      import('topojson-client'),
      import('world-atlas/land-110m.json'),
    ]);
    const topology = ((landModule as { default?: unknown }).default ?? landModule) as Topology;
    const land = topology.objects.land as TopoObject | undefined;
    if (!land) throw new Error('world-atlas: "land" object missing');
    const boundaries = mesh(topology, land);
    const out: number[] = [];
    const a = new Vector3();
    const b = new Vector3();
    for (const line of boundaries.coordinates) {
      for (let i = 0; i < line.length - 1; i++) {
        const p = line[i];
        const q = line[i + 1];
        if (!p || !q) continue;
        latLonToVector3(p[1] ?? 0, p[0] ?? 0, 1, a);
        latLonToVector3(q[1] ?? 0, q[0] ?? 0, 1, b);
        out.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    return new Float32Array(out);
  })();
  coastlinePromise.catch(() => {
    coastlinePromise = null;
  });
  return coastlinePromise;
}
