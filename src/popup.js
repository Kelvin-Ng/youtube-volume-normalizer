'use strict';

import Config from './utils/config.js';

(async function() {
    const useSysVolYes = document.getElementById('useSysVolYes');
    const useSysVolNo = document.getElementById('useSysVolNo');

    const useSysVol = await Config.get('useSysVol', false);

    if (useSysVol) {
        useSysVolYes.checked = true;
    } else {
        useSysVolNo.checked = true;
    }

    useSysVolYes.addEventListener('click', function() {
        Config.set('useSysVol', true);
    });
    useSysVolNo.addEventListener('click', function() {
        Config.set('useSysVol', false);
    });
})();
