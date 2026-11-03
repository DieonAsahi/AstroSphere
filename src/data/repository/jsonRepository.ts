import bodies from '../bodies.json';
import pois from '../pois.json';
import type { CelestialBody, PointOfInterest } from '../types';
import type { BodyRepository, PoiRepository } from './types';

const bodyData = bodies as CelestialBody[];
const poiData = pois as PointOfInterest[];

export const jsonBodyRepository: BodyRepository = {
  async listBodies() {
    return bodyData;
  },
  async getBodyById(id) {
    return bodyData.find((body) => body.id === id);
  },
};

export const jsonPoiRepository: PoiRepository = {
  async listPois() {
    return poiData;
  },
  async listPoisByBody(bodyId) {
    return poiData.filter((poi) => poi.bodyId === bodyId);
  },
  async getPoiById(id) {
    return poiData.find((poi) => poi.id === id);
  },
  async getPoiBySlug(bodyId, slug) {
    return poiData.find((poi) => poi.bodyId === bodyId && poi.slug === slug);
  },
};

export const bodyRepository = jsonBodyRepository;
export const poiRepository = jsonPoiRepository;
