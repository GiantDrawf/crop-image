const { merge } = require('webpack-merge');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const portfinder = require('portfinder');
const baseWebpackConfig = require('./webpack.base');
const config = require('./config');

const devWebpackConfig = merge(baseWebpackConfig, {
  mode: 'development',
  entry: {
    app: './dev/index.tsx'
  },
  output: {
    filename: 'js/[name].[hash:8].js',
    publicPath: config.publicPath
  },
  module: {
    rules: [
      {
        oneOf: [
          {
            test: /\.(html)$/,
            loader: 'html-loader'
          },
          {
            test: /\.(j|t)sx?$/,
            include: path.resolve(__dirname, '../dev'),
            use: [
              {
                loader: 'babel-loader',
                options: {
                  presets: [
                    '@babel/preset-react',
                    ['@babel/preset-env', { useBuiltIns: 'usage', corejs: 2 }]
                  ],
                  plugins: [
                    ['@babel/plugin-proposal-class-properties', { loose: true }]
                  ],
                  cacheDirectory: true
                }
              },
              {
                loader: 'ts-loader'
              }
            ]
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: config.indexPath,
      showErrors: true
    }),
    new webpack.HotModuleReplacementPlugin()
  ],
  devServer: {
    ...config.devServer
  }
});

module.exports = new Promise((resolve, reject) => {
  portfinder.basePort = config.devServer.port;
  portfinder.getPort((err, port) => {
    if (err) reject(err);
    else {
      devWebpackConfig.devServer.port = port;
    }
    resolve(devWebpackConfig);
  });
});
