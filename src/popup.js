'use strict';

import Config from './utils/config.js';
import { storageSyncGet, storageSyncSet }from './utils/storage.js';

async function loadRadioYesNo(name) {
    const yesEle = document.getElementById(name + 'Yes');
    const noEle = document.getElementById(name + 'No');

    const isYes = await Config.get(name, false);

    if (isYes) {
        yesEle.checked = true;
    } else {
        noEle.checked = true;
    }

    yesEle.addEventListener('click', function() {
        Config.set(name, true);
    });
    noEle.addEventListener('click', function() {
        Config.set(name, false);
    });
}

(async function() {
    loadRadioYesNo('useSysVol');
    loadRadioYesNo('usePeak');

    const debugClearBtn = document.getElementById('debugClear');
    debugClearBtn.onclick = async (evt) => {
        await browser.storage.sync.clear();
    }

    const debugPrintBtn = document.getElementById('debugPrint');
    debugPrintBtn.onclick = async (evt) => {
        console.log(JSON.stringify(await browser.storage.sync.get(null)));
    }

    const showDebugBtn = document.getElementById('showDebug');
    const debugDiv = document.getElementById('debug');
    showDebugBtn.onclick = (evt) => {
        debugDiv.style.display = '';
    }
})();
