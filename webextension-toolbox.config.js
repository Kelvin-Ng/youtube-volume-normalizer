const webpack = require('webpack');

module.exports = {
    webpack: (config, { dev, vendor }) => {
        if (['chrome', 'opera', 'edge'].includes(vendor)) {
            config.plugins.push(
                new webpack.ProvidePlugin({
                    browser: require.resolve('webextension-polyfill')
                })
            );
        }

        return config;
    },
};
