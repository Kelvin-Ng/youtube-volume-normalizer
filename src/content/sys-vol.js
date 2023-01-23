'use strict';

import { InfoPanel } from './info-panel.js';

class AudioPeakGraph {
    constructor() {
        this.audioCtx = new AudioContext();
    }

    updateStream(stream) {
        this.stream = stream;
        this.source = this.audioCtx.createMediaStreamSource(this.stream);
    }
}

function videoSrcUpdated(videoEle, infoPanel, audioPeakGraph) {
    console.log('YouTube Volume Normalizer: Video source updated');
    //var stream = videoEle.captureStream();

    infoPanel.refresh();
    if (!videoEle.paused && !videoEle.muted) {
        var dB = infoPanel.getDb();
        if (dB > 0) {
            dB = 0;
        }
        browser.runtime.sendMessage({type: 'set', dB: -dB});
    }
}

function videoPlayed(evt, videoEle, infoPanel) {
    if (!videoEle.muted) {
        var dB = infoPanel.getDb();
        if (dB > 0) {
            dB = 0;
        }
        browser.runtime.sendMessage({type: 'set', dB: -dB});
    }
}

function videoPaused(evt) {
    browser.runtime.sendMessage({type: 'unset'});
}

function videoVolumeChange(evt, videoEle, infoPanel) {
    if (videoEle.muted) {
        browser.runtime.sendMessage({type: 'unset'});
    } else {
        var dB = infoPanel.getDb();
        if (dB > 0) {
            dB = 0;
        }
        browser.runtime.sendMessage({type: 'set', dB: -dB});
    }
}

function sysVol(videoEle, infoPanel) {
    // All Web Audio API stuff will be useful later
    //var audioPeakGraph = new AudioPeakGraph();
    var audioPeakGraph = null;

    //if (!videoEle.captureStream) {
    //    videoEle.captureStream = videoEle.mozCaptureStream;
    //}

    videoSrcUpdated(videoEle, infoPanel, audioPeakGraph);

    const observer = new MutationObserver(mutations => {
        videoSrcUpdated(videoEle, infoPanel, audioPeakGraph);
    });

    observer.observe(videoEle, {
        attributeFilter: ['src',],
    });

    videoEle.addEventListener('play', (evt) => {
        videoPlayed(evt, videoEle, infoPanel);
    });
    videoEle.addEventListener('pause', videoPaused);
    videoEle.addEventListener('ended', videoPaused);
    videoEle.addEventListener('volumechange', (evt) => {
        videoVolumeChange(evt, videoEle, infoPanel);
    });
}

export { sysVol };

