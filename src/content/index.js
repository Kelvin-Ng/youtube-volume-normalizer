'use strict';

import { InfoPanel } from './info-panel.js';
import { waitForElement } from './dom-utils.js';
import { amplify } from './amplify.js';
//import { sysVol } from './sys-vol.js';

(async function() {
    console.log('Youtube Volume Normalizer started');

    var videoEle = await waitForElement('.html5-main-video');

    var infoPanel = new InfoPanel();
    await infoPanel.init();

    const useSysVol = false;

    if (useSysVol) {
        //sysVol(videoEle, infoPanel);
    } else {
        amplify(videoEle, infoPanel);
    }
})();
