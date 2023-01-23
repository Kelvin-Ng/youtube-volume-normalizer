'use strict';

async function storageSyncGet(key, defaultVal = null) {
    var item = await browser.storage.sync.get({[key]: defaultVal});
    return item[key];
}

function storageSyncSet(key, val) {
    return browser.storage.sync.set({[key]: val});
}

async function storageLocalGet(key, defaultVal = null) {
    var item = await browser.storage.local.get({[key]: defaultVal});
    return item[key];
}

function storageLocalSet(key, val) {
    return browser.storage.local.set({[key]: val});
}

export { storageSyncGet, storageSyncSet, storageLocalGet, storageLocalSet };

