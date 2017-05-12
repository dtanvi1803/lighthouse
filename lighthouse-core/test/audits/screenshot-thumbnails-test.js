/**
 * Copyright 2016 Google Inc. All rights reserved.
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

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const Runner = require('../../runner.js');
const Audit = require('../../audits/screenshot-thumbnails');
const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');

/* eslint-env mocha */

describe('Screenshot thumbnails', () => {
  it('should extract thumbnails from a trace', () => {
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace}
    }, Runner.instantiateComputedArtifacts());

    return Audit.audit(artifacts).then(results => {
      results.rawValue.forEach((result, index) => {
        const framePath = path.join(__dirname,
            `../fixtures/traces/progressive-app-frame-${index}.jpg`);
        fs.writeFileSync(framePath, new Buffer(result.data, 'base64'));
        const expectedData = fs.readFileSync(framePath, 'base64');
        assert.equal(expectedData.length, result.data.length);
      });

      assert.equal(results.rawValue[0].timing, 0);
      assert.equal(results.rawValue[2].timing, 182);
      assert.equal(results.rawValue[9].timing, 818);
      assert.equal(results.rawValue[0].timestamp, 225414172015);
    });
  });
});
