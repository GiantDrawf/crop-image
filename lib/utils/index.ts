import { Crop, Crops, SetCropsAction, ImageProperties } from '../types';

export const defaultCrop = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  unit: 'px',
  model: 'mosaic'
};

export const emptyFuc = (arg: any) => {};

/**
 * 获取点位坐标
 * @param e event
 */
export const getClientPos = (e: any) => {
  let pageX;
  let pageY;

  if (e.touches) {
    [{ pageX, pageY }] = e.touches;
  } else {
    ({ pageX, pageY } = e);
  }

  return {
    x: pageX,
    y: pageY
  };
};

export const getDocumentOffset = () => {
  const { clientTop = 0, clientLeft = 0 } = document.documentElement || {};
  return { clientTop, clientLeft };
};

export const getWindowOffset = () => {
  const { pageYOffset = 0, pageXOffset = 0 } = window;
  return { pageYOffset, pageXOffset };
};

/**
 * 获取
 * @param el el
 */
export const getElementOffset = (
  el: HTMLDivElement | HTMLImageElement | null
) => {
  if (el) {
    const rect = el.getBoundingClientRect();
    const doc = getDocumentOffset();
    const win = getWindowOffset();

    const top = rect.top + win.pageYOffset - doc.clientTop;
    const left = rect.left + win.pageXOffset - doc.clientLeft;

    return { top, left };
  }
  return { top: 0, left: 0 };
};

/**
 * 转化成px Crop
 * @param crop
 * @param imageWidth
 * @param imageHeight
 */
export const convertToPixelCrop = (
  crop: Crop,
  imageWidth: number,
  imageHeight: number
): Crop => {
  if (!crop.unit) {
    return { ...crop, unit: 'px' };
  }

  if (crop.unit === 'px') {
    return crop;
  }

  return {
    unit: 'px',
    model: crop.model || 'mosaic',
    x: (crop.x * imageWidth) / 100,
    y: (crop.y * imageHeight) / 100,
    width: (crop.width * imageWidth) / 100,
    height: (crop.height * imageHeight) / 100
  };
};

/**
 * 转化为百分比Crop
 * @param crop Crop
 * @param imageWidth
 * @param imageHeight
 */
export const convertToPercentCrop = (
  crop: Crop,
  imageWidth: number,
  imageHeight: number
): Crop => {
  if (crop.unit === '%') {
    return crop;
  }

  return {
    unit: '%',
    model: crop.model || 'mosaic',
    x: (crop.x / imageWidth) * 100,
    y: (crop.y / imageHeight) * 100,
    width: (crop.width / imageWidth) * 100,
    height: (crop.height / imageHeight) * 100
  };
};

export const clamp = (num: number, min: number, max: number) => {
  return Math.min(Math.max(num, min), max);
};

export const containCrop = (
  crop: Crop,
  imageWidth: number,
  imageHeight: number
) => {
  const pixelCrop = convertToPixelCrop(crop, imageWidth, imageHeight);
  const contained = { ...pixelCrop };

  if (pixelCrop.x < 0) {
    contained.x = 0;
    contained.width += pixelCrop.x;
  } else if (pixelCrop.x + pixelCrop.width > imageWidth) {
    contained.width = imageWidth - pixelCrop.x;
  }

  if (pixelCrop.y < 0) {
    contained.y = 0;
    contained.height = imageHeight;
  } else if (pixelCrop.y + pixelCrop.height > imageHeight) {
    contained.y = 0;
    contained.height = imageHeight;
  }

  return contained;
};

/**
 * 溢出检查
 * @param crop
 * @param imageWidth
 * @param imageHeight
 */
export const overflowCheck = (
  crop: Crop,
  imageWidth: number,
  imageHeight: number
): Crop => {
  const newCrop = { ...crop };

  if (newCrop.width > imageWidth) {
    newCrop.width = imageWidth;
  } else if (newCrop.width < 0) {
    newCrop.width = 0;
  }

  if (newCrop.height > imageHeight) {
    newCrop.height = imageHeight;
  } else if (newCrop.height < 0) {
    newCrop.height = 0;
  }

  if (newCrop.y < 0) {
    newCrop.y = 0;
  } else if (newCrop.y > imageHeight) {
    newCrop.y = imageHeight;
  }

  if (newCrop.x < 0) {
    newCrop.x = 0;
  } else if (newCrop.x > imageWidth) {
    newCrop.x = imageWidth;
  }

  return newCrop;
};

export const xyOrds = ['nw', 'ne', 'se', 'sw'];

export const xOrds = ['e', 'w'];
export const yOrds = ['n', 's'];

export const inverseOrd = (ord: string) => {
  if (ord === 'n') return 's';
  if (ord === 'ne') return 'sw';
  if (ord === 'e') return 'w';
  if (ord === 'se') return 'nw';
  if (ord === 's') return 'n';
  if (ord === 'sw') return 'ne';
  if (ord === 'w') return 'e';
  if (ord === 'nw') return 'se';
  return ord;
};

export const getTimeString = () => {
  return Math.round(new Date().getTime() / 1000).toString();
};

export const mosaicCropsMap = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
export const cutCropsMap = ['n', 'e', 's', 'w'];

export const cropsReducer = (state: Crops, action: SetCropsAction) => {
  switch (action.type) {
    case 'set':
    default:
      return { ...state, ...action.payload };
    case 'reset':
      return { ...action.payload };
  }
};

export const addCutCrops = (
  originalCrops: Crops,
  imageWidth: number,
  imageHeight: number,
  depth: number = 20
) => {
  const newCrops = { ...originalCrops };
  cutCropsMap.forEach((itemCutOrd: string) => {
    if (!newCrops[`crop_cut_${itemCutOrd}`]) {
      newCrops[`crop_cut_${itemCutOrd}`] = {
        x: itemCutOrd === 'w' ? imageWidth : 0,
        y: itemCutOrd === 'n' ? imageHeight - depth : 0,
        width: itemCutOrd === 'n' || itemCutOrd === 's' ? imageWidth : 0,
        height:
          itemCutOrd === 'w' || itemCutOrd === 'e'
            ? imageHeight
            : itemCutOrd === 'n'
            ? depth
            : 0,
        unit: 'px',
        model: 'cut',
        ord: itemCutOrd
      };
    }
  });

  return newCrops;
};

export const customCutCrops = (
  originalCrops: Crops,
  imageWidth: number,
  imageHeight: number,
  depth: number = 20
) => {
  const newCrops = { ...originalCrops };
  cutCropsMap.forEach((itemCutOrd: string) => {
    newCrops[`crop_cut_${itemCutOrd}`] = {
      x: itemCutOrd === 'w' ? imageWidth : 0,
      y: itemCutOrd === 'n' ? imageHeight - depth : 0,
      width: itemCutOrd === 'n' || itemCutOrd === 's' ? imageWidth : 0,
      height:
        itemCutOrd === 'w' || itemCutOrd === 'e'
          ? imageHeight
          : itemCutOrd === 'n'
          ? depth
          : 0,
      unit: 'px',
      model: 'cut',
      ord: itemCutOrd
    };
  });

  return newCrops;
};

/**
 * 处理元素全屏
 * @param {Boolean} isFullscreen 是否全屏
 * @param element ele
 */
export const handleElementFullScreen = (
  isFullscreen: boolean,
  element?: HTMLElement | HTMLDivElement | null
): Promise<void> => {
  return new Promise(
    (
      resolve: (value?: void | PromiseLike<void>) => void,
      reject: (reason?: any) => void
    ) => {
      if (isFullscreen) {
        if (element && element.requestFullscreen) {
          resolve(element.requestFullscreen());
        }

        reject('element上不存在requestFullscreen接口');
      } else {
        if (document && document.exitFullscreen) {
          resolve(document.exitFullscreen());
        }

        reject('document无法退出全屏，请按ESC');
      }
    }
  );
};

export const makeNewCrop = (
  mediaProperties: ImageProperties,
  crop: Crop = defaultCrop
): Crop => {
  const { width, height } = mediaProperties;

  return crop.unit === 'px'
    ? convertToPixelCrop(crop, width, height)
    : convertToPercentCrop(crop, width, height);
};
