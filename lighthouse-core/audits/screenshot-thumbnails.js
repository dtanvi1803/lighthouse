/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const jpeg = require('jpeg-js');

const NUMBER_OF_THUMBNAILS = 10;
const THUMBNAIL_HEIGHT = 100;

class ScreenshotThumbnails extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Images',
      name: 'screenshot-thumbnails',
      description: 'Screenshot Thumbnails',
      helpText: 'This is what the load of your site looked like.',
      requiredArtifacts: ['traces']
    };
  }

  /**
   * Scales down an image to THUMBNAIL_HEIGHT using nearest neighbor for speed, maintains aspect
   * ratio of the original thumbnail.
   *
   * @param {{width: number, height: number, data: !Array<number>}} imageData
   * @return {{width: number, height: number, data: !Array<number>}}
   */
  static scaleImageToThumbnail(imageData) {
    const scaledHeight = THUMBNAIL_HEIGHT;
    const scaleFactor = imageData.height / scaledHeight;
    const scaledWidth = Math.floor(imageData.width / scaleFactor);

    const outPixels = new Uint8Array(scaledWidth * scaledHeight * 4);

    for (let i = 0; i < scaledWidth; i++) {
      for (let j = 0; j < scaledHeight; j++) {
        const origX = Math.floor(i * scaleFactor);
        const origY = Math.floor(j * scaleFactor);

        const origPos = (origY * imageData.width + origX) * 4;
        const outPos = (j * scaledWidth + i) * 4;

        outPixels[outPos] = imageData.data[origPos];
        outPixels[outPos + 1] = imageData.data[origPos + 1];
        outPixels[outPos + 2] = imageData.data[origPos + 2];
        outPixels[outPos + 3] = imageData.data[origPos + 3];
      }
    }

    return {
      width: scaledWidth,
      height: scaledHeight,
      data: outPixels,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const cachedThumbnails = new Map();

    return artifacts.requestSpeedline(trace).then(speedline => {
      const thumbnails = [];
      const analyzedFrames = speedline.frames.filter(frame => !frame.isProgressInterpolated());

      for (let i = 1; i <= NUMBER_OF_THUMBNAILS; i++) {
        const targetTimestamp = speedline.beginning + speedline.complete * i / NUMBER_OF_THUMBNAILS;

        let targetFrame = null;
        if (i === NUMBER_OF_THUMBNAILS) {
          targetFrame = analyzedFrames[analyzedFrames.length - 1];
        } else {
          analyzedFrames.forEach(frame => {
            if (frame.getTimeStamp() <= targetTimestamp) {
              targetFrame = frame;
            }
          });
        }

        const imageData = targetFrame.getParsedImage();
        const thumbnailImageData = ScreenshotThumbnails.scaleImageToThumbnail(imageData);
        const base64Data = cachedThumbnails.get(targetFrame) ||
            jpeg.encode(thumbnailImageData, 90).data.toString('base64');

        cachedThumbnails.set(targetFrame, base64Data);
        thumbnails.push({
          timing: Math.round(targetTimestamp - speedline.beginning),
          timestamp: targetTimestamp * 1000,
          data: base64Data,
        });
      }

      return {rawValue: thumbnails};
    });
  }
}

module.exports = ScreenshotThumbnails;
