const path = require('path');

module.exports = {
  assetsRoot: path.resolve(__dirname, '../dist'),
  assetsDirectory: 'static',
  publicPath: '/',
  indexPath: path.resolve(__dirname, '../dev/index.html'),
  devServer: {
    port: 8080,
    disableHostCheck: true,
    historyApiFallback: true,
    watchOptions: {
      ignored: /node_modules/
    },
    hot: true,
    contentBase: [
      path.resolve(__dirname, '../lib'),
      path.resolve(__dirname, '../dev')
    ],
    watchContentBase: true,
    overlay: true
  }
};
