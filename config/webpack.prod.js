const { merge } = require('webpack-merge');
const baseWebpackConfig = require('./webpack.base');
const config = require('./config');

module.exports = merge(baseWebpackConfig, {
  mode: 'production',
  entry: {
    app: './lib/index.ts'
  },
  output: {
    filename: 'CropImage.js',
    path: config.assetsRoot,
    library: 'CropImage',
    libraryTarget: 'umd',
    globalObject: 'this',
    publicPath: config.publicPath
  },
  target: 'web',
  externals: {
    react: {
      root: 'React',
      commonjs: 'react',
      commonjs2: 'react',
      amd: 'react'
    }
  },
  module: {
    rules: [
      {
        oneOf: [
          {
            test: /\.(jpg|jpeg|bmp|png|webp|gif|svg)$/,
            loader: 'url-loader',
            options: {
              limit: 8 * 1024,
              name: 'img/[name].[contenthash:8].[ext]',
              outputPath: config.assetsDirectory,
              publicPath: config.assetsRoot
            }
          },
          {
            exclude: [/\.(js|mjs|ts|tsx|less|css|jsx)$/, /\.html$/, /\.json$/],
            loader: 'file-loader',
            options: {
              name: 'media/[path][name].[contenthash:8].[ext]',
              outputPath: config.assetsDirectory,
              publicPath: config.assetsRoot
            }
          }
        ]
      }
    ]
  }
});
