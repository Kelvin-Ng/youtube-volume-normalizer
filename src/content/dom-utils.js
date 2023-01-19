'use strict';

// https://stackoverflow.com/a/14284815
function getElementByXpath(path, contextNode) {
    return document.evaluate(path, contextNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

// https://stackoverflow.com/a/61511955
function waitFor(func) {
    return new Promise(resolve => {
        const res = func();
        if (res) {
            return resolve(res);
        }

        const observer = new MutationObserver(mutations => {
            const res = func();
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

export { getElementByXpath, waitFor, waitForElement, waitForXpath };

