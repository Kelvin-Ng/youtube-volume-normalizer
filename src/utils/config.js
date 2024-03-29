'use strict';

import { storageSyncGet, storageSyncSet } from './storage.js';

export default class Config {
    static get(key, defaultVal = null) {
        return storageSyncGet('__config_' + key, defaultVal);
    }

    static set(key, val) {
        return storageSyncSet('__config_' + key, val);
    }

    static isConfig(key) {
        return key.slice(0, 9) == '__config_';
    }
}

