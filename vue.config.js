module.exports = {
    configureWebpack: {
        devtool: "source-map"
    }
    , devServer: {
        allowedHosts: [
        'localhost',
        'spacy-server',
        ],
  },
};