'use strict';

import { InfoPanel } from './info-panel.js';
import { getElementByXpath, waitFor, waitForElement, waitForXpath } from './dom-utils.js';

function updateVolume(audioGraph, infoPanel) {
    console.log('Youtube Volume Normalizer: New video');
    infoPanel.refresh();
    const dB = infoPanel.getDb();

    console.log('Youtube Volume Normalizer: Average volume: ' + dB + 'dB');

    if (dB >= 0) {
        console.log('Youtube Volume Normalizer: No amplification needed');
        // Reset to no gain because YouTube already normalize the volume when it is too loud
        if (!infoPanel.isUseDefault()) {
            console.log('Youtube Volume Normalizer: Disconnecting audio graph');
            audioGraph.disconnect();
            infoPanel.setUseDefault();
        }
    } else {
        audioGraph.set(dB);

        if (infoPanel.isUseDefault()) {
            console.log('Youtube Volume Normalizer: Connecting audio graph');
            audioGraph.connect();
            infoPanel.unsetUseDefault();
        }

        const actualGain = Math.pow(10, -dB / 20);
        infoPanel.update(actualGain);
        console.log('Youtube Volume Normalizer: Gain: ' + -dB + 'dB' + ' (' + actualGain * 100 + '%)');
    }
}

class AudioGraph {
    constructor(videoEle) {
        this.audioCtx = new AudioContext();

        this.limiterNode = this.audioCtx.createDynamicsCompressor();
        this.limiterNode.threshold.value = 0;
        this.limiterNode.knee.value = 0;
        this.limiterNode.ratio.value = 20.0;
        this.limiterNode.attack.value = 0.001;
        this.limiterNode.release.value = 0.1;

        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 1.0;

        this.videoEleSource = this.audioCtx.createMediaElementSource(videoEle);
        this.videoEleSource.connect(this.audioCtx.destination);

        this.limiterNode.connect(this.gainNode);
    }

    set(dB) {
        // `dB` is the gain relative to YouTube preferred level (let's call the YouTube preferred level as 0dBYT)
        // We want to apply a gain of -`dB`dB so that the final volume is 0dBYT.

        // To avoid clipping, the maximum volume after amplification have to be below 0 LUFS.
        // That means, before amplification, we want to compress so that the maximum volume is below `dB` LUFS.
        // Considering the compresion curve, we want threshold - (1/ratio)*threshold < `dB`. Solving this equation yields the below formula:
        const ratio = this.limiterNode.ratio.value;
        this.limiterNode.threshold.value = ratio / (ratio - 1.0) * dB;

        // Then we do the actual amplification. However, the DynamicsCompressorNode will apply a makeup gain.
        // The makeup gain it applies is 0.6 * -(maximum gain according to compression curve).
        // (Ref.: https://webaudio.github.io/web-audio-api/#computing-the-makeup-gain)
        // We have set the threshold so that the maximum gain is `dB`dB.
        // So, the makeup gain is -0.6 * `dB`dB. So, we only need to apply a gain of -0.4 * `dB`dB so that the total gain is -`dB`dB.
        this.gainNode.gain.value = Math.pow(10, -0.4 * dB / 20);
    }

    connect() {
        this.videoEleSource.disconnect();
        this.videoEleSource.connect(this.limiterNode);
        this.gainNode.connect(this.audioCtx.destination);
    }

    disconnect() {
        this.gainNode.disconnect();
        this.videoEleSource.disconnect();
        this.videoEleSource.connect(this.audioCtx.destination);
    }
}

(async function() {
    console.log('Youtube Volume Normalizer started');

    var videoEle = await waitForElement('.html5-main-video');
    console.log('Youtube Volume Normalizer: abc');

    var infoPanel = new InfoPanel();
    await infoPanel.init();

    var audioGraph = new AudioGraph(videoEle);

    updateVolume(audioGraph, infoPanel);

    const observer = new MutationObserver(mutations => {
        updateVolume(audioGraph, infoPanel);
    });

    observer.observe(videoEle, {
        attributeFilter: ['src',],
    });
})();
