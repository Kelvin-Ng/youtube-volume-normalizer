'use strict';

async function storageSyncGet(key, defaultVal = null) {
    var item = await browser.storage.sync.get({[key]: defaultVal});
    return item[key];
}

function storageSyncSet(key, val) {
    return browser.storage.sync.set({[key]: val});
}

export { storageSyncGet, storageSyncSet };

