'use strict';

import { getElementByXpath, waitFor, waitForElement, waitForXpath } from './dom-utils.js';

class InfoPanel {
    constructor() {
        this.myGain = 1;

        this.useDefault = true;

        this.observer = new MutationObserver(mutations => {
            this.update();
        });

        this.numToSkip = 0;
    }

    async init() {
        var moviePlayerEle = await waitForElement('#movie_player');
        var contextEvt = new MouseEvent('contextmenu');
        moviePlayerEle.dispatchEvent(contextEvt);

        var menuEle = await waitForElement('.ytp-contextmenu');
        this.menuItem = await waitForXpath('div/div/div[6]', menuEle);
        this.clickEvt = new MouseEvent('click');
        this.menuItem.dispatchEvent(this.clickEvt);
        this.closeButton = await waitForElement('.html5-video-info-panel-close');
        this.closeButton.dispatchEvent(this.clickEvt);
        this.panelContent = await waitForElement('.html5-video-info-panel-content');
        this.contentLoudnessEle = await waitForXpath('div[4]/span', this.panelContent);
        this.videoIdEle = await waitForElement('.ytp-sfn-cpn');

        this.observer.observe(this.contentLoudnessEle, {
            characterData: true,
            childList: true,
            subtree: true,
        });
    }

    refresh() {
        this.closeButton.dispatchEvent(this.clickEvt);
        this.menuItem.dispatchEvent(this.clickEvt);
        this.closeButton.dispatchEvent(this.clickEvt);
    }

    getDb() {
        var contentLoudnessStr = this.contentLoudnessEle.innerText.split(' ');
        if (contentLoudnessStr.length < 7) {
            return 0;
        }

        var dB = parseFloat(contentLoudnessStr[6].slice(0, -3));
        return dB;
    }

    getVideoId() {
        return this.videoIdEle.innerText.split(' / ')[0].trim();
    }

    setUseDefault() {
        this.useDefault = true;
    }

    unsetUseDefault() {
        this.useDefault = false;
    }

    isUseDefault() {
        return this.useDefault;
    }

    update(val) {
        if (this.numToSkip > 0) {
            this.numToSkip -= 1;
            return;
        }

        if (this.useDefault) {
            return;
        }

        if (typeof val !== 'undefined') {
            this.myGain = val;
        }

        var contentLoudnessStr = this.contentLoudnessEle.innerText.split(' ');
        if (contentLoudnessStr.length < 4) {
            return;
        }

        var basicGain = parseFloat(contentLoudnessStr[1].slice(0, -1)) / 100;
        var percentage = Math.round(this.myGain * basicGain * 100);
        this.contentLoudnessEle.innerText = this.contentLoudnessEle.innerText.replace(/ \/ \d+\%/i, ' / ' + percentage + '%'); // The regex means ' / X%'

        this.numToSkip += 1;
    }
}

export { InfoPanel };

