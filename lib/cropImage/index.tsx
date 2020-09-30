import React, {
  FC,
  useState,
  useRef,
  useEffect,
  useCallback,
  Fragment
} from 'react';
import { useFullscreen } from '@umijs/hooks';
import clsx from 'clsx';
import {
  CropImageProps,
  WorkModel,
  Crop,
  SetCropsAction,
  ImageProperties
} from '../types';
import styles from './index.less';
import {
  emptyFuc,
  getClientPos,
  getElementOffset,
  convertToPixelCrop,
  clamp,
  defaultCrop as initCrop,
  getTimeString,
  cutCropsMap,
  mosaicCropsMap,
  addCutCrops,
  customCutCrops,
  overflowCheck
} from '../utils/';
let passiveSupported = false;

try {
  const opts = Object.defineProperty({}, 'passive', {
    get: () => {
      passiveSupported = true;
      return passiveSupported;
    }
  });
  // @ts-ignore
  window.addEventListener('test', null, opts);
} catch (e) {} // eslint-disable-line no-empty

const options = passiveSupported ? { passive: false } : false;

/**
 * 裁图组件
 * @param {CropImageProps} props CropImageProps
 */
const CropImage: FC<CropImageProps> = (props: CropImageProps) => {
  const {
    url,
    crops,
    onCropsChange,
    model = 'cut',
    className = '',
    disabled = false,
    locked = false,
    customDepth = 20,
    onImageLoaded = emptyFuc,
    onImageError = emptyFuc
  } = props;
  const fullScreenAspectRatio = useRef<number>(1);
  const componentRef = useRef<HTMLDivElement>(null);
  const mediaWrapperRef = useRef<HTMLDivElement>(null);
  const mouseDownOnCrop = useRef<boolean>(false);
  const dragStarted = useRef<boolean>(false);
  const evData = useRef<any>({});
  const tempCustomDepth = useRef<number>(customDepth);
  const [beReadyToWork, setReadyToWork] = useState<boolean>(false);
  const [workModel, setWorkModel] = useState<string>(() => model);
  const [currentWorkCrop, setCurrentWorkCrop] = useState<string>('');
  const currentWorkCropKey = useRef<string>(currentWorkCrop);
  const { isFullscreen, setFull, exitFull, ref } = useFullscreen<
    HTMLDivElement
  >({
    onFull: () => {
      // eslint-disable-next-line no-use-before-define
      generateCrop(true);
    },
    onExitFull: () => {
      // eslint-disable-next-line no-use-before-define
      generateCrop(false);
    }
  });

  const mediaDimensions = useCallback((): ImageProperties => {
    return {
      url,
      width: mediaWrapperRef.current?.clientWidth || 0,
      height: mediaWrapperRef.current?.clientHeight || 0,
      // @ts-ignore
      naturalWidth: mediaWrapperRef.current?.firstChild?.naturalWidth || 0,
      // @ts-ignore
      naturalHeight: mediaWrapperRef.current?.firstChild?.naturalHeight || 0
    };
  }, [url]);

  const _onCropsChange = useCallback(
    (action: SetCropsAction) => {
      let latestCrops = {};
      switch (action.type) {
        case 'set':
        default:
          latestCrops = { ...crops, ...action.payload };
          break;
        case 'reset':
          latestCrops = action.payload;
          break;
      }
      onCropsChange(
        latestCrops,
        mediaDimensions(),
        action.isFullscreen || false
      );
    },
    [crops, onCropsChange, mediaDimensions]
  );

  const makeNewCrop = useCallback(
    (crop: Crop = initCrop) => {
      const { width, height } = mediaDimensions();

      return crop.unit === 'px'
        ? convertToPixelCrop(crop, width, height)
        : convertToPixelCrop(crop, width, height);
    },
    [mediaDimensions]
  );

  const getCropStyle = (crop: Crop) => {
    const _crop = makeNewCrop(crop);

    return {
      top: `${_crop.y}${_crop.unit}`,
      left: `${_crop.x}${_crop.unit}`,
      width: `${_crop.width}${_crop.unit}`,
      height: `${_crop.height}${_crop.unit}`
    };
  };

  const onComponentMouseTouchDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // 禁用拖拽默认行为
      event.preventDefault();

      // 仅涂抹模式
      if (workModel !== 'mosaic') {
        return;
      }

      const downTarget = event.target;
      const imageComponentEl = mediaWrapperRef.current?.firstChild;

      // @ts-ignore
      const downTargetClassName = downTarget.className;
      // 如果点击的是已选择区域，这里不处理
      if (
        downTargetClassName &&
        downTargetClassName.indexOf('ReactCrop__crop_selection') >= 0
      ) {
        return;
      }

      if (downTarget !== imageComponentEl) {
        return;
      }

      if (disabled || locked) {
        return;
      }

      const mosaicCropLength = Object.keys(crops).filter(
        (key: string) => key.indexOf('crop_mosaic_') === 0
      ).length;

      // 最多三个涂抹区域
      if (mosaicCropLength === 3) {
        return;
      }

      const clientPos = getClientPos(event);
      const mediaOffset = getElementOffset(mediaWrapperRef.current);

      const x = clientPos.x - mediaOffset.left;
      const y = clientPos.y - mediaOffset.top;

      const nextCrop = {
        unit: 'px',
        model: 'mosaic',
        x,
        y,
        width: 0,
        height: 0
      };
      const { width, height } = mediaDimensions();

      evData.current = {
        clientStartX: clientPos.x,
        clientStartY: clientPos.y,
        cropStartWidth: nextCrop.width,
        cropStartHeight: nextCrop.height,
        cropStartX: nextCrop.x,
        cropStartY: nextCrop.y,
        xInversed: false,
        yInversed: false,
        xCrossOver: false,
        yCrossOver: false,
        startXCrossOver: false,
        startYCrossOver: false,
        isResize: true,
        ord: 'se'
      };

      const pixelCrop = convertToPixelCrop(nextCrop, width, height);
      mouseDownOnCrop.current = true;
      const newCropKey = `crop_mosaic_${getTimeString()}`;
      setCurrentWorkCrop(newCropKey);
      currentWorkCropKey.current = newCropKey;
      // 统一以px形式存
      _onCropsChange({
        type: 'set',
        payload: { [newCropKey]: pixelCrop }
      });
    },
    [crops, _onCropsChange, disabled, locked, mediaDimensions, workModel]
  );

  const generateCrop = useCallback(
    (isFull: boolean) => {
      // 全屏切换，重新计算所有宽高及位置
      const fullAspectRatio = isFull
        ? 1 / fullScreenAspectRatio.current
        : fullScreenAspectRatio.current;
      Object.keys(crops).forEach((key: string) => {
        crops[key].x = crops[key].x * fullAspectRatio;
        crops[key].y = crops[key].y * fullAspectRatio;
        crops[key].width = crops[key].width * fullAspectRatio;
        crops[key].height = crops[key].height * fullAspectRatio;
      });
      _onCropsChange({ type: 'reset', payload: crops, isFullscreen: isFull });
    },
    [crops, _onCropsChange]
  );

  const onComponentKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { key } = e;

      // 选中某个crop删除快捷键
      if (key === 'Backspace' && currentWorkCrop) {
        const newCrops = { ...crops };
        delete newCrops[currentWorkCrop];
        _onCropsChange({ type: 'reset', payload: newCrops });
      }
    },
    [crops, currentWorkCrop, _onCropsChange]
  );

  const onCropMouseTouchDown = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    dataKey: string
  ) => {
    if (disabled || locked) {
      return;
    }
    event.preventDefault();

    const { width, height } = mediaDimensions();

    const currentCrop = crops[dataKey];

    if (dataKey.indexOf(workModel) > 0 && currentCrop) {
      setCurrentWorkCrop(dataKey);
      currentWorkCropKey.current = dataKey;

      const downTarget = event.target;
      const pixelCrop = convertToPixelCrop(currentCrop, width, height);
      const clientPos = getClientPos(event);
      // @ts-ignore
      const { ord } = downTarget.dataset;
      const xInversed = ord === 'nw' || ord === 'w' || ord === 'sw';
      const yInversed = ord === 'nw' || ord === 'n' || ord === 'ne';

      evData.current = {
        clientStartX: clientPos.x,
        clientStartY: clientPos.y,
        cropStartWidth: pixelCrop.width,
        cropStartHeight: pixelCrop.height,
        cropStartX: pixelCrop.x,
        cropStartY: pixelCrop.y,
        xInversed,
        yInversed,
        xCrossOver: xInversed,
        yCrossOver: yInversed,
        startXCrossOver: xInversed,
        startYCrossOver: yInversed,
        isResize: ord,
        ord
      };

      mouseDownOnCrop.current = true;
    }
  };

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      const image = e.target;
      // @ts-ignore
      const { width, height, naturalWidth } = image;

      if (model === 'cut') {
        const setCrops = addCutCrops(crops, width, height, customDepth);
        _onCropsChange({
          type: 'set',
          payload: setCrops
        });
      }

      // 真实宽高比
      fullScreenAspectRatio.current = width / naturalWidth;

      setReadyToWork(true);
      onImageLoaded(image);
    },
    [
      onImageLoaded,
      _onCropsChange,
      customDepth,
      fullScreenAspectRatio,
      setReadyToWork,
      crops,
      model
    ]
  );

  const componentClasses = clsx(styles.ReactCrop, className, {
    [`${styles[`ReactCrop_workModel_${workModel}`]}`]: !!workModel
  });

  const switchWorkModel = useCallback(
    (selectModel: WorkModel) => {
      setWorkModel(selectModel === workModel ? '' : selectModel);
      // 切换到裁剪模式时需要补充裁剪crop
      if (selectModel === 'cut' && workModel === 'mosaic') {
        const { width, height } = mediaDimensions();
        const newCropsWithCutCrop = addCutCrops(
          crops,
          width,
          height,
          customDepth
        );
        _onCropsChange({
          type: 'set',
          payload: newCropsWithCutCrop
        });
      } else {
        // 清理crops中宽高为0的
        const cleanCrops = { ...crops };
        Object.keys(cleanCrops).forEach((itemCropKey: string) => {
          if (
            cleanCrops[itemCropKey].width === 0 ||
            cleanCrops[itemCropKey].height === 0
          ) {
            delete cleanCrops[itemCropKey];
          }
        });
        _onCropsChange({
          type: 'reset',
          payload: cleanCrops
        });
      }
    },
    [
      setWorkModel,
      workModel,
      crops,
      _onCropsChange,
      mediaDimensions,
      customDepth
    ]
  );

  const createCropSelection = (cropItem: Crop, dataKey: string) => {
    const style = getCropStyle(cropItem);

    return (
      <div
        key={dataKey}
        className={`${styles.ReactCrop__crop_selection} ${dataKey}`}
        style={style}
        id={dataKey}
        onMouseDown={(e: React.MouseEvent<HTMLDivElement, MouseEvent>) =>
          onCropMouseTouchDown(e, dataKey)
        }
      >
        <div className={styles.ReactCrop__drag_elements}>
          {currentWorkCrop === dataKey && !locked ? (
            <Fragment>
              {cropItem.model === 'mosaic' && workModel === 'mosaic' ? (
                <Fragment>
                  {/* 线 */}
                  {cutCropsMap.map((ord: string) => (
                    <div
                      key={ord}
                      className={`${styles.ReactCrop__drag_bar} ${
                        styles[`ord_${ord}`]
                      }`}
                      data-ord={ord}
                    />
                  ))}
                  {/* 框 */}
                  {mosaicCropsMap.map((ord: string) => (
                    <div
                      key={ord}
                      className={`${styles.ReactCrop__drag_handle} ${
                        styles[`ord_${ord}`]
                      }`}
                      data-ord={ord}
                    />
                  ))}
                </Fragment>
              ) : null}
            </Fragment>
          ) : null}
          {cropItem.model === 'cut' && workModel === 'cut' && !locked ? (
            <Fragment>
              {/* 线 */}
              <div
                data-ord={cropItem.ord}
                className={`${styles.ReactCrop__drag_bar} ${
                  styles[`ord_${cropItem.ord}`]
                }`}
              />
              {/* 框 */}
              <div
                data-ord={cropItem.ord}
                className={`${styles.ReactCrop__drag_handle} ${
                  styles[`ord_${cropItem.ord}`]
                }`}
              />
            </Fragment>
          ) : null}
        </div>
      </div>
    );
  };

  // const getNewSize = useCallback(() => {
  //   const { width, height } = mediaDimensions();

  //   // New width.
  //   let newWidth = evData.current.cropStartWidth + evData.current.xDiff;

  //   if (evData.current.xCrossOver) {
  //     newWidth = Math.abs(newWidth);
  //   }

  //   newWidth = clamp(newWidth, minWidth, maxWidth || width);

  //   let newHeight = evData.current.cropStartHeight + evData.current.yDiff;

  //   if (evData.current.yCrossOver) {
  //     newHeight = Math.min(Math.abs(newHeight), evData.current.cropStartY);
  //   }

  //   newHeight = clamp(newHeight, minHeight, maxHeight || height);

  //   return {
  //     width: newWidth,
  //     height: newHeight
  //   };
  // }, [maxHeight, maxWidth, minHeight, minWidth, mediaDimensions]);

  // const crossOverCheck = useCallback(() => {
  //   if (
  //     !minWidth &&
  //     ((!evData.current.xCrossOver &&
  //       -Math.abs(evData.current.cropStartWidth) - evData.current.xDiff >= 0) ||
  //       (evData.current.xCrossOver &&
  //         -Math.abs(evData.current.cropStartWidth) - evData.current.xDiff <= 0))
  //   ) {
  //     evData.current.xCrossOver = !evData.current.xCrossOver;
  //   }

  //   if (
  //     !minHeight &&
  //     ((!evData.current.yCrossOver &&
  //       -Math.abs(evData.current.cropStartHeight) - evData.current.yDiff >=
  //         0) ||
  //       (evData.current.yCrossOver &&
  //         -Math.abs(evData.current.cropStartHeight) - evData.current.yDiff <=
  //           0))
  //   ) {
  //     evData.current.yCrossOver = !evData.current.yCrossOver;
  //   }

  //   const swapXOrd =
  //     evData.current.xCrossOver !== evData.current.startXCrossOver;
  //   const swapYOrd =
  //     evData.current.yCrossOver !== evData.current.startYCrossOver;

  //   evData.current.inversedXOrd = swapXOrd
  //     ? inverseOrd(evData.current.ord)
  //     : false;
  //   evData.current.inversedYOrd = swapYOrd
  //     ? inverseOrd(evData.current.ord)
  //     : false;
  // }, [minHeight, minWidth]);

  // const resizeCrop = useCallback(
  //   (crop: Crop) => {
  //     const nextCrop = makeNewCrop();
  //     const { ord } = evData.current;
  //     if (evData.current.xInversed) {
  //       evData.current.xDiff -= evData.current.cropStartWidth * 2;
  //     }
  //     if (evData.current.yInversed) {
  //       evData.current.yDiff -= evData.current.cropStartHeight * 2;
  //     }

  //     // New size.
  //     const newSize = getNewSize();

  //     let newX = evData.current.cropStartX;
  //     let newY = evData.current.cropStartY;

  //     if (evData.current.xCrossOver) {
  //       newX = nextCrop.x + (nextCrop.width - newSize.width);
  //     }

  //     if (evData.current.yCrossOver) {
  //       if (evData.current.lastYCrossover === false) {
  //         newY = nextCrop.y - newSize.height;
  //       } else {
  //         newY = nextCrop.y + (nextCrop.height - newSize.height);
  //       }
  //     }

  //     const { width, height } = mediaDimensions();
  //     const containedCrop = containCrop(
  //       {
  //         unit: nextCrop.unit,
  //         model: crop.model,
  //         x: newX,
  //         y: newY,
  //         width: newSize.width,
  //         height: newSize.height
  //       },
  //       width,
  //       height
  //     );

  //     if (xyOrds.indexOf(ord) > -1) {
  //       nextCrop.x = containedCrop.x;
  //       nextCrop.y = containedCrop.y;
  //       nextCrop.width = containedCrop.width;
  //       nextCrop.height = containedCrop.height;
  //     } else if (xOrds.indexOf(ord) > -1) {
  //       nextCrop.x = containedCrop.x;
  //       nextCrop.width = containedCrop.width;
  //     } else if (yOrds.indexOf(ord) > -1) {
  //       nextCrop.y = containedCrop.y;
  //       nextCrop.height = containedCrop.height;
  //     }

  //     evData.current.lastYCrossover = evData.current.yCrossOver;
  //     crossOverCheck();

  //     return containedCrop;
  //   },
  //   [crossOverCheck, getNewSize, mediaDimensions, makeNewCrop]
  // );

  // 翻转检测
  const crossOverCheck = useCallback((crop: Crop) => {
    const cropEndPointX =
      evData.current.cropStartWidth + evData.current.cropStartX;
    const cropEndPointY =
      evData.current.cropStartHeight + evData.current.cropStartY;

    return crop;
  }, []);

  const resizeCrop = useCallback(
    (crop: Crop) => {
      const newCrop = { ...crop };
      const { ord, xDiff, yDiff } = evData.current;
      if (ord === 'n') {
        newCrop.height -= yDiff;
        newCrop.y += yDiff;
      } else if (ord === 's') {
        newCrop.height += yDiff;
      } else if (ord === 'w') {
        newCrop.width -= xDiff;
        newCrop.x += xDiff;
      } else if (ord === 'e') {
        newCrop.width += xDiff;
      } else if (ord === 'se') {
        newCrop.width += xDiff;
        newCrop.height += yDiff;
      } else if (ord === 'nw') {
        newCrop.width -= xDiff;
        newCrop.height -= yDiff;
        newCrop.x += xDiff;
        newCrop.y += yDiff;
      } else if (ord === 'ne') {
        newCrop.width += xDiff;
        newCrop.height -= yDiff;
        newCrop.y += yDiff;
      } else if (ord === 'sw') {
        newCrop.width -= xDiff;
        newCrop.height += yDiff;
        newCrop.x += xDiff;
      }

      const { width, height } = mediaDimensions();
      // 翻转监测
      // const crossOverCheckedCrop = crossOverCheck(newCrop);
      // 溢出检测
      const checkedOverflowCrop = overflowCheck(newCrop, width, height);

      return checkedOverflowCrop;
    },
    [mediaDimensions]
  );

  const dragCrop = useCallback(
    (crop: Crop) => {
      const { width, height } = mediaDimensions();

      return {
        ...crop,
        x: clamp(
          evData.current.cropStartX + evData.current.xDiff,
          0,
          width - crop.width
        ),
        y: clamp(
          evData.current.cropStartY + evData.current.yDiff,
          0,
          height - crop.height
        )
      };
    },
    [mediaDimensions]
  );

  const onDocMouseTouchMove = useCallback(
    (event: MouseEvent) => {
      event.preventDefault();

      if (disabled || locked) {
        return;
      }

      if (!mouseDownOnCrop.current) {
        return;
      }

      if (!dragStarted.current) {
        dragStarted.current = true;
      }

      const clientPos = getClientPos(event);

      evData.current.xDiff = clientPos.x - evData.current.clientStartX;
      evData.current.yDiff = clientPos.y - evData.current.clientStartY;

      if (currentWorkCropKey.current && crops[currentWorkCropKey.current]) {
        const currentCrop = crops[currentWorkCropKey.current];
        let nextCrop = { ...currentCrop };

        if (evData.current.isResize) {
          nextCrop = resizeCrop(currentCrop);
        } else if (workModel !== 'cut') {
          nextCrop = dragCrop(currentCrop);
        }

        if (nextCrop !== currentCrop) {
          const { width, height } = mediaDimensions();
          const pixelCrop = convertToPixelCrop(nextCrop, width, height);
          const workCrop = ref?.current.getElementsByClassName(
            currentWorkCropKey.current
          )[0];
          workCrop?.setAttribute(
            'style',
            `top: ${pixelCrop.y}px;left: ${pixelCrop.x}px;width: ${pixelCrop.width}px;height: ${pixelCrop.height}px`
          );
        }
      }
    },
    [
      ref,
      workModel,
      mediaDimensions,
      evData,
      disabled,
      locked,
      mouseDownOnCrop,
      dragStarted,
      resizeCrop,
      dragCrop,
      crops,
      currentWorkCropKey
    ]
  );

  const onDocMouseTouchEnd = useCallback(() => {
    if (disabled || locked) {
      return;
    }
    if (mouseDownOnCrop.current) {
      // 获取当前crop位置和宽高并存储
      const workCrop = ref?.current.getElementsByClassName(
        currentWorkCropKey.current
      )[0] as HTMLElement;
      const nextCrops = { ...crops };
      // 只有一个裁剪，清空其它
      if (currentWorkCropKey.current.indexOf('crop_cut_') === 0) {
        Object.keys(nextCrops).forEach((itemKey: string) => {
          if (
            itemKey.indexOf('crop_cut_') === 0 &&
            itemKey !== currentWorkCropKey.current
          ) {
            const ord = itemKey.substring(9);
            if (ord === 'e' || ord === 'w') {
              nextCrops[itemKey].width = 0;
            } else {
              nextCrops[itemKey].height = 0;
            }
            if (ord === 'n') {
              nextCrops[itemKey].y = mediaDimensions().height;
            } else if (ord === 'w') {
              nextCrops[itemKey].x = mediaDimensions().width;
            }
          } else if (itemKey.indexOf('crop_mosaic_') === 0) {
            // 清洗宽高为零的涂抹
            if (
              nextCrops[itemKey].width === 0 ||
              nextCrops[itemKey].height === 0
            ) {
              delete nextCrops[itemKey];
            }
          }
        });
      }
      if (workCrop) {
        nextCrops[currentWorkCropKey.current] = {
          ...nextCrops[currentWorkCropKey.current],
          width: Number(workCrop?.style.width.replace('px', '') || 0),
          height: Number(workCrop?.style.height.replace('px', '') || 0),
          x: Number(workCrop?.style.left.replace('px', '') || 0),
          y: Number(workCrop?.style.top.replace('px', '') || 0)
        };
        _onCropsChange({
          type: 'reset',
          payload: nextCrops
        });
      }

      mouseDownOnCrop.current = false;
      dragStarted.current = false;
      currentWorkCropKey.current = '';
      evData.current = {};
    }
  }, [ref, disabled, locked, crops, _onCropsChange, mediaDimensions]);

  const switchFullScreenStatus = useCallback(() => {
    if (isFullscreen) {
      exitFull();
    } else {
      setFull();
    }
  }, [exitFull, setFull, isFullscreen]);

  useEffect(() => {
    window.addEventListener('mousemove', onDocMouseTouchMove, options);
    window.addEventListener('mouseup', onDocMouseTouchEnd, options);
    window.addEventListener('keydown', onComponentKeyDown);

    return () => {
      window.removeEventListener('mousemove', onDocMouseTouchMove);
      window.removeEventListener('mouseup', onDocMouseTouchEnd);
      window.removeEventListener('keydown', onComponentKeyDown);
    };
  }, [onDocMouseTouchMove, onDocMouseTouchEnd, onComponentKeyDown]);

  useEffect(() => {
    if (!locked && tempCustomDepth.current !== customDepth) {
      const { height, width } = mediaDimensions();
      const newCrops = customCutCrops(crops, width, height, customDepth);
      tempCustomDepth.current = customDepth;
      if (JSON.stringify(newCrops) !== JSON.stringify(crops)) {
        _onCropsChange({ type: 'reset', payload: newCrops });
      }
    }
  }, [customDepth, crops, locked, _onCropsChange, mediaDimensions]);

  return (
    <div
      id={url}
      className={`${styles.react_crop_box} ${
        isFullscreen ? styles.fullCropBox : ''
      }`}
      ref={ref}
    >
      {/* 切换工作模式 */}
      {!disabled && beReadyToWork && !locked ? (
        <div
          className={`${styles.switchWorkModel} ${
            isFullscreen ? styles.fullScreenSwitch : ''
          }`}
        >
          <div
            onClick={switchFullScreenStatus}
            className={`${styles.switchFullScreen} ${
              isFullscreen ? styles.fullScreen : styles.exitFullScreen
            }`}
          />
          <div
            onClick={() => switchWorkModel('cut')}
            className={`${styles.workModelBtn} ${styles.cutModel} ${
              workModel === 'cut' ? styles.currentModel : ''
            }`}
          />
          <div
            onClick={() => switchWorkModel('mosaic')}
            className={`${styles.workModelBtn} ${styles.mosaicModel} ${
              workModel === 'mosaic' ? styles.currentModel : ''
            }`}
          />
        </div>
      ) : null}
      <div
        ref={componentRef}
        onMouseDown={onComponentMouseTouchDown}
        className={componentClasses}
      >
        <div ref={mediaWrapperRef}>
          <img
            className={styles.ReactCrop__image}
            src={url}
            onLoad={onImageLoad}
            onError={onImageError}
          />
        </div>
        {/* 滑动模块 */}
        {!disabled &&
          Object.keys(crops).map((key: string) =>
            createCropSelection(crops[key], key)
          )}
      </div>
    </div>
  );
};

export default CropImage;
