import type { CelestialBody, PointOfInterest } from '../types';

export interface BodyRepository {
  listBodies(): Promise<CelestialBody[]>;
  getBodyById(id: string): Promise<CelestialBody | undefined>;
}

export interface PoiRepository {
  listPois(): Promise<PointOfInterest[]>;
  listPoisByBody(bodyId: string): Promise<PointOfInterest[]>;
  getPoiById(id: string): Promise<PointOfInterest | undefined>;
  getPoiBySlug(
    bodyId: string,
    slug: string,
  ): Promise<PointOfInterest | undefined>;
}
