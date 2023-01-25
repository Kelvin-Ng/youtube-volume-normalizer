'use strict';

import { storageLocalGet, storageLocalSet, storageSyncGet, storageSyncSet } from './utils/storage.js';
import Config from './utils/config.js'

function adjustSysVol(prevVol, newVol) {
    console.log('Youtube Volume Normalizer: Adjust system volume offset from ' + prevVol + 'dB to ' + newVol + 'dB');
    browser.runtime.sendNativeMessage('youtube.volume.normalizer', {prevDb: prevVol, newDb: newVol});
}

async function setTabVol(tabId, vol, inactive) {
    if (inactive) {
        await storageLocalSet('inactiveTabVol_' + tabId, vol);
    } else {
        await browser.storage.local.remove('inactiveTabVol_' + tabId);

        var activeTabsVol = await storageLocalGet('activeTabsVol', {});
        activeTabsVol[tabId] = vol;
        await storageLocalSet('activeTabsVol', activeTabsVol);

        const curGlobalVol = await storageLocalGet('curGlobalVol');
        if (curGlobalVol == null || vol < curGlobalVol) {
            await storageLocalSet('curGlobalVol', vol);
            adjustSysVol(curGlobalVol == null ? 0 : curGlobalVol, vol);
        }
    }
}

async function unsetTabVol(tabId, inactive) {
    var activeTabsVol = await storageLocalGet('activeTabsVol', {});

    if (tabId in activeTabsVol) {
        const curTabVol = activeTabsVol[tabId];
        delete activeTabsVol[tabId];
        await storageLocalSet('activeTabsVol', activeTabsVol);

        const curGlobalVol = await storageLocalGet('curGlobalVol');

        if (inactive) {
            await storageLocalSet('inactiveTabVol_' + tabId, curTabVol);
        }

        if (curTabVol == curGlobalVol) {
            const allVols = Object.values(activeTabsVol);
            if (allVols.length == 0) {
                await browser.storage.local.remove('curGlobalVol');
                adjustSysVol(curGlobalVol, 0);
            } else {
                const newGlobalVol = Math.min(...allVols);
                await storageLocalSet('curGlobalVol', newGlobalVol);
                adjustSysVol(curGlobalVol, newGlobalVol);
            }
        }
    } else {
        if (!inactive) {
            await browser.storage.local.remove('inactiveTabVol_' + tabId);
        }
    }
}

async function activateTabVol(tabId) {
    const inactiveTabVol = await storageLocalGet('inactiveTabVol_' + tabId);
    if (inactiveTabVol == null) {
        return;
    }
    await browser.storage.local.remove('inactiveTabVol_' + tabId);

    var activeTabsVol = await storageLocalGet('activeTabsVol', {});
    if (tabId in activeTabsVol) {
        return;
    }
    activeTabsVol[tabId] = inactiveTabVol;
    await storageLocalSet('activeTabsVol', activeTabsVol);

    const curGlobalVol = await storageLocalGet('curGlobalVol');
    if (curGlobalVol == null || inactiveTabVol < curGlobalVol) {
        await storageLocalSet('curGlobalVol', inactiveTabVol);
        adjustSysVol(curGlobalVol == null ? 0 : curGlobalVol, inactiveTabVol);
    }
}

async function getPeak(videoId) {
    const res = await storageSyncGet(videoId, [0, 0]);
    return res[0];
}

async function storePeak(videoId, peakRatio) {
    console.log('YouTube Volume Normalizer: Storing peak for ' + videoId + ' as ' + peakRatio);

    const timestamp = Date.now();
    while (true) {
        try {
            await storageSyncSet(videoId, [peakRatio, timestamp]);
            break;
        } catch (err) {
            const allPeaks = await browser.storage.sync.get(null);

            let smallestTimestamp = Infinity;
            let keyWithSmallestTimestamp = null;
            for (let key in allPeaks) {
                if (Config.isConfig(key)) {
                    continue;
                }

                if (allPeaks[key][1] < smallestTimestamp) {
                    smallestTimestamp = allPeaks[key][1];
                    keyWithSmallestTimestamp = key;
                }
            }
            if (keyWithSmallestTimestamp == null) {
                throw err;
            }
            await browser.storage.sync.remove(keyWithSmallestTimestamp);
        }
    }
}

function handleTabUpdated(tabId, changeInfo, tabInfo) {
    navigator.locks.request('events', async (lock) => {
        if (changeInfo.url) {
            await unsetTabVol(tabId, false);
        } else if ('audible' in changeInfo) {
            if (changeInfo.audible) {
                await activateTabVol(tabId);
            } else {
                await unsetTabVol(tabId, true);
            }
        }
    });
}

function handleTabRemoved(tabId, removeInfo) {
    navigator.locks.request('events', async (lock) => {
        await unsetTabVol(tabId, false);
    });
}

function handleMessage(message, sender, sendResponse) {
    return navigator.locks.request('events', async (lock) => {
        const tabId = sender.tab.id;

        if (message.type == 'applyGain') {
            await setTabVol(tabId, message.dB, !sender.tab.audible);
        } else if (message.type == 'revertGain') {
            await unsetTabVol(tabId, false);
        } else if (message.type == 'getPeak') {
            return getPeak(message.videoId);
        } else if (message.type == 'storePeak') {
            await storePeak(message.videoId, message.peakRatio);
        }
    });
}

async function reset() {
    const curGlobalVol = await storageLocalGet('curGlobalVol');
    if (curGlobalVol != null && curGlobalVol != 0) {
        adjustSysVol(curGlobalVol, 0);
    }

    await browser.storage.local.clear();
}

function handleInstalled() {
    navigator.locks.request('events', async (lock) => {
        console.log('YouTube Volume Normalizer: Installed and started');
        await reset();
    });
}

function handleStartup() {
    navigator.locks.request('events', async (lock) => {
        console.log('YouTube Volume Normalizer: Started');
        await reset();
    });
}

browser.runtime.onInstalled.addListener(handleInstalled);
browser.runtime.onStartup.addListener(handleStartup);
browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.tabs.onRemoved.addListener(handleTabRemoved);
browser.runtime.onMessage.addListener(handleMessage);
