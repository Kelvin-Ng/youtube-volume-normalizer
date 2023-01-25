'use strict';

import { InfoPanel } from './info-panel.js';
import Config from '../utils/config.js';
import { db2ratio, ratio2db } from '../utils/db.js';
import * as WebAudioPeakMeter from 'web-audio-peak-meter';

class Context {
    constructor(videoEle, infoPanel, audioPeakGraph) {
        this.maxPeakAfterGainDb = -1.;

        this.videoEle = videoEle;
        this.infoPanel = infoPanel;
        this.audioPeakGraph = audioPeakGraph;
    }

    async refresh() {
        this.infoPanel.refresh();
        this.audioPeakGraph.disconnect();

        this.videoId = this.infoPanel.getVideoId();
        this.avgDb = this.infoPanel.getDb();
        this.peakRatio = 0;
        if (this.avgDb < 0) {
            this.gainDb = -this.avgDb;
            this.updatePeak(await this.getPeak());
        } else {
            this.gainDb = 0;
        }
        this.stream = null;
    }

    updatePeak(peakRatio) {
        //console.log('YouTube Volume Normalizer: updatePeak: ' + peakRatio); // too much output
        if (peakRatio > this.peakRatio) {
            //console.log('YouTube Volume Normalizer: New Peak detected: ' + this.peakRatio + ' -> ' + peakRatio); // too much output

            this.peakRatio = peakRatio;
            this.peakDb = ratio2db(this.peakRatio);

            if (this.avgDb < 0) {
                const peakAfterGainDb = this.peakDb - this.avgDb;
                if (peakAfterGainDb > this.maxPeakAfterGainDb) {
                    this.gainDb = this.maxPeakAfterGainDb - this.peakDb;
                    if (this.gainDb < 0) {
                        this.gainDb = 0;
                    }
                    //console.log('YouTube Volume Normalizer: Peak after gain is too high. New gain: ' + this.gainDb + 'dB'); // too much output
                } else {
                    this.gainDb = -this.avgDb;
                }

                if (!this.videoEle.paused && !this.videoEle.muted) {
                    this.applyGain();
                }
            }
        }
    }

    applyGain() {
        //console.log('YouTube Volume Normalizer: Applying gain: ' + this.gainDb + 'dB'); // too much output
        browser.runtime.sendMessage({type: 'applyGain', dB: this.gainDb});
    }

    revertGain() {
        console.log('YouTube Volume Normalizer: Reverting gain');
        browser.runtime.sendMessage({type: 'revertGain'});
    }

    storePeak() {
        if (this.peakRatio > 0) {
            console.log('YouTube Volume Normalizer: Store peak as ' + this.peakRatio);
            browser.runtime.sendMessage({type: 'storePeak', videoId: this.videoId, peakRatio: this.peakRatio});
        }
    }

    async getPeak() {
        const peakRatio = await browser.runtime.sendMessage({type: 'getPeak', videoId: this.videoId});
        return peakRatio;
    }
}

class AudioPeakGraph {
    constructor(audioCtx) {
        this.audioCtx = audioCtx;
    }

    updateSource(source, callback) {
        this.source = source;

        this.meterNode = WebAudioPeakMeter.createMeterNode(this.source, this.audioCtx);
        WebAudioPeakMeter.createMeter(null, this.meterNode, {}, callback);
    }

    disconnect() {
        if (this.source != null) {
            this.source.disconnect();
            this.source = null;
        }
        if (this.meterNode != null) {
            this.meterNode.onaudioprocess = null;
            this.meterNode = null;
        }
        this.audioCtx.suspend();
    }
}

function tryUpdateAudioPeakGraphSource(context) {
    if (context.stream == null) {
        context.stream = context.videoEle.captureStream();
        if (context.stream.getAudioTracks().length == 0) {
            context.addTrackListener = (evt) => {
                tryUpdateAudioPeakGraphSource(context);
            };
            context.stream.addEventListener('addtrack', context.addTrackListener);
            return;
        }
    }

    console.log('YouTube Volume Normalizer: New track detected');

    if (context.stream.getAudioTracks().length == 0) {
        return;
    }

    context.audioPeakGraph.updateSource(context.audioPeakGraph.audioCtx.createMediaStreamSource(context.stream), (metaData) => {
        context.updatePeak(Math.max(...metaData.heldPeaks));
    });

    context.stream.removeEventListener('addtrack', context.addTrackListener)
}

async function videoSrcUpdated(context) {
    console.log('YouTube Volume Normalizer: Video source updated');

    await context.refresh();

    console.log('YouTube Volume Normalizer: Video ID: ' + context.videoId);

    if (context.avgDb < 0 && context.audioPeakGraph) {
        tryUpdateAudioPeakGraphSource(context);
    }

    if (!context.videoEle.paused && !context.videoEle.muted) {
        context.applyGain();
    }
}

function videoPlayed(evt, context) {
    if (context.audioPeakGraph != null && context.avgDb < 0) {
        context.audioPeakGraph.audioCtx.resume();
    }

    if (!context.videoEle.muted) {
        context.applyGain();
    }
}

function videoPaused(evt, context) {
    if (context.audioPeakGraph != null) {
        context.audioPeakGraph.audioCtx.suspend();
    }

    context.revertGain();
}

function videoVolumeChange(evt, context) {
    if (context.videoEle.muted) {
        context.videoEle.revertGain();
    } else {
        context.videoEle.applyGain();
    }
}

async function sysVol(videoEle, infoPanel) {
    if (!videoEle.captureStream) {
        videoEle.captureStream = videoEle.mozCaptureStream;
    }

    const usePeak = await Config.get('usePeak', false);
    let audioPeakGraph = null;
    if (usePeak) {
        const audioCtx = new AudioContext();
        audioPeakGraph = new AudioPeakGraph(audioCtx);
    }

    const context = new Context(videoEle, infoPanel, audioPeakGraph);

    videoSrcUpdated(context);

    const observer = new MutationObserver(mutations => {
        if (usePeak) {
            context.storePeak();
        }
        videoSrcUpdated(context);
    });

    observer.observe(videoEle, {
        attributeFilter: ['src',],
    });

    videoEle.addEventListener('play', (evt) => {
        videoPlayed(evt, context);
    });
    videoEle.addEventListener('pause', (evt) => {
        videoPaused(evt, context);
    });
    videoEle.addEventListener('ended', (evt) => {
        videoPaused(evt, context);
    });
    videoEle.addEventListener('volumechange', (evt) => {
        videoVolumeChange(evt, context);
    });

    window.addEventListener('unload', (evt) => {
        console.log('YouTube Volume Normalizer: Unloading, storing peak');
        if (usePeak) {
            context.storePeak();
        }
    });
}

export { sysVol };

