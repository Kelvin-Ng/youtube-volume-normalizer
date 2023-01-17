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

function updateVolume(gainNode, infoPanel) {
    console.log('Youtube Volume Normalizer: Update volume');
    infoPanel.refresh();
    dB = infoPanel.getDb();

    console.log('Youtube Volume Normalizer: Average volume: ' + dB + 'dB');

    if (dB >= 0) {
        // Reset to no gain because YouTube already normalize the volume when it is too loud
        gainNode.gain.value = 1.0;
        infoPanel.setUseDefault();
    } else {
        gainNode.gain.value = Math.pow(10, -dB/20);
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
        var contentLoudnessStr = this.contentLoudnessEle.innerHTML.split(' ');
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

        var contentLoudnessStr = this.contentLoudnessEle.innerHTML.split(' ');
        if (contentLoudnessStr.length < 4) {
            return;
        }

        var basicGain = parseFloat(contentLoudnessStr[1].slice(0, -1)) / 100;
        var percentage = Math.round(this.myGain * basicGain * 100);
        this.contentLoudnessEle.innerHTML = this.contentLoudnessEle.innerHTML.replace(/ \/ \d+\%/i, ' / ' + percentage + '%'); // The regex means ' / X%'

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
    var gainNode = audioCtx.createGain();
    gainNode.channelInterpretation = 'speakers';
    gainNode.gain.value = 1.0;

    function connectOutput(element) {
        audioCtx.createMediaElementSource(element).connect(gainNode);
        gainNode.connect(audioCtx.destination);
    }
    videoElements.forEach(connectOutput);
    audioElements.forEach(connectOutput);

    updateVolume(gainNode, infoPanel);

    const observer = new MutationObserver(mutations => {
        updateVolume(gainNode, infoPanel);
    });

    observer.observe(videoEle, {
        attributeFilter: ['src',],
    });
})();
