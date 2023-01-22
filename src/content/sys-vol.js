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
    var stream = videoEle.captureStream();
}

function sysVol(videoEle, infoPanel) {
    var audioPeakGraph = new AudioPeakGraph();

    if (!videoEle.captureStream) {
        videoEle.captureStream = videoEle.mozCaptureStream;
    }

    addEventListener('durationchange', (event) => {
        videoSrcUpdated(videoEle, infoPanel, audioPeakGraph);
    });

    videoSrcUpdated(videoEle, infoPanel, audioPeakGraph);

    const observer = new MutationObserver(mutations => {
        videoSrcUpdated(videoEle, infoPanel, audioPeakGraph);
    });

    observer.observe(videoEle, {
        attributeFilter: ['src',],
    });
}

export { sysVol };

