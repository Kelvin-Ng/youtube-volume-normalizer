// https://stackoverflow.com/a/14284815
function getElementByXpath(path, contextNode) {
    return document.evaluate(path, contextNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// https://stackoverflow.com/a/61511955
function waitFor(func) {
    return new Promise(resolve => {
        res = func();
        if (res) {
            return resolve(res);
        }

        const observer = new MutationObserver(mutations => {
            res = func();
            if (res) {
                resolve(res);
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

function waitForElement(selector) {
    return waitFor(() => {
        return document.querySelector(selector);
    });
}

function waitForXpath(path, contextNode) {
    return waitFor(() => {
        return getElementByXpath(path, contextNode);
    });
}

function updateVolume(gainNode, limiterNode, infoPanel) {
    console.log('Youtube Volume Normalizer: Update volume');
    infoPanel.refresh();
    dB = infoPanel.getDb();

    console.log('Youtube Volume Normalizer: Average volume: ' + dB + 'dB');

    if (dB >= 0) {
        // Reset to no gain because YouTube already normalize the volume when it is too loud
        gainNode.gain.value = 1.0;
        infoPanel.setUseDefault();
    } else {
        // `dB` is the gain relative to YouTube preferred level (let's call the YouTube preferred level as 0dBYT)
        // We want to apply a gain of -`dB`dB so that the final volume is 0dBYT.

        // To avoid clipping, the maximum volume after amplification have to be below 0 LUFS.
        // That means, before amplification, we want to compress so that the maximum volume is below `dB` LUFS.
        // Considering the compresion curve, we want threshold - (1/ratio)*threshold < `dB`. Solving this equation yields the below formula:
        const ratio = limiterNode.ratio.value;
        limiterNode.threshold.value = ratio / (ratio - 1.0) * dB;

        // Then we do the actual amplification. However, the DynamicsCompressorNode will apply a makeup gain.
        // The makeup gain it applies is 0.6 * -(maximum gain according to compression curve).
        // (Ref.: https://webaudio.github.io/web-audio-api/#computing-the-makeup-gain)
        // We have set the threshold so that the maximum gain is `dB`dB.
        // So, the makeup gain is -0.6 * `dB`dB. So, we only need to apply a gain of -0.4 * `dB`dB so that the total gain is -`dB`dB.
        gainNode.gain.value = Math.pow(10, -dB * 0.4 / 20);
        infoPanel.unsetUseDefault();
        infoPanel.update(gainNode.gain.value);
        console.log('Youtube Volume Normalizer: Gain: ' + -dB + 'dB' + ' (' + gainNode.gain.value * 100 + '%)');
    }
}

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

    setUseDefault() {
        this.useDefault = true;
    }

    unsetUseDefault() {
        this.useDefault = false;
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

(async function() {
    console.log('Youtube Volume Normalizer started');

    var videoEle = await waitForElement('.html5-main-video');

    var infoPanel = new InfoPanel();
    await infoPanel.init();

    var videoElements = document.querySelectorAll("video");
    var audioElements = document.querySelectorAll("audio");
    if (videoElements.length == 0 && audioElements.length == 0) {
    	return;
    }

    var audioCtx = new AudioContext();

    var limiterNode = audioCtx.createDynamicsCompressor();
    limiterNode.threshold.value = 0;
    limiterNode.knee.value = 0;
    limiterNode.ratio.value = 40.0;
    limiterNode.attack.value = 0.001;
    limiterNode.release.value = 0.1;

    var gainNode = audioCtx.createGain();
    gainNode.channelInterpretation = 'speakers';
    gainNode.gain.value = 1.0;

    function connectOutput(element) {
        audioCtx.createMediaElementSource(element).connect(limiterNode);
        limiterNode.connect(gainNode);
        gainNode.connect(audioCtx.destination);
    }
    videoElements.forEach(connectOutput);
    audioElements.forEach(connectOutput);

    updateVolume(gainNode, limiterNode, infoPanel);

    const observer = new MutationObserver(mutations => {
        updateVolume(gainNode, limiterNode, infoPanel);
    });

    observer.observe(videoEle, {
        attributeFilter: ['src',],
    });
})();
