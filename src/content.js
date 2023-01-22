'use strict';

import { InfoPanel } from './content/info-panel.js';
import { waitForElement } from './content/dom-utils.js';
import Config from './utils/config.js';
import { amplify } from './content/amplify.js';
import { sysVol } from './content/sys-vol.js';

(async function() {
    console.log('Youtube Volume Normalizer started');

    var videoEle = await waitForElement('.html5-main-video');

    var infoPanel = new InfoPanel();
    await infoPanel.init();

    const useSysVol = await Config.get('useSysVol', false);
    if (useSysVol) {
        sysVol(videoEle, infoPanel);
    } else {
        amplify(videoEle, infoPanel);
    }
})();
