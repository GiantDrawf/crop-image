import { SyntheticEvent } from 'react';

export interface Crop {
  unit: string;
  model: string;
  ord?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type WorkModel = 'cut' | 'mosaic' | '';

export interface CropComponentProps {
  crop: Crop;
  workModel: string;
  disabled: boolean;
}

export interface Crops {
  [key: string]: Crop;
}

export interface ImageProperties {
  url: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface CropImageHandle {
  localCrops(): void;
}

export interface SetCropsAction {
  type: 'set' | 'reset';
  payload: Crops;
  isFullscreen?: boolean;
}

export interface CropImageProps {
  url: string;
  crops: Crops;
  customDepth?: number;
  onCropsChange: (
    crops: Crops,
    image?: ImageProperties,
    isFullScreen?: boolean
  ) => void;
  model?: string;
  disabled?: boolean;
  locked?: boolean;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  onImageLoaded?: (image?: EventTarget) => void;
  onImageError?: (event: SyntheticEvent<HTMLImageElement, Event>) => void;
}
