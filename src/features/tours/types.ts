export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export interface TourStep {
  id: string;
  tourId: string;
  poiId: string;
  poiName: string;
  bodyId: string;
  bodyName: string;
  stepNo: number;
  narrationText: string;
  cameraPreset: CameraPreset;
  durationS: number;
}

export interface Tour {
  id: string;
  createdBy: string;
  authorName: string;
  title: string;
  description: string;
  isPublished: boolean;
  classIds: string[];
  steps: TourStep[];
  createdAt: string;
  updatedAt: string;
}
