'use strict';

const path = require('path');
const config = require('./config');

const APP_PATH = path.resolve(__dirname, '../lib');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.(j|t)sx?$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        options: {
          emitWarning: true,
          emitError: true,
          fix: true
        }
      },
      {
        oneOf: [
          {
            test: /\.(less|css)$/,
            use: [
              { loader: 'style-loader' },
              {
                loader: 'css-loader',
                options: {
                  modules: {
                    localIdentName: '[path][name]_[local]'
                  }
                }
              },
              {
                loader: 'less-loader',
                options: { lessOptions: { javascriptEnabled: true } }
              }
            ]
          },
          {
            test: /\.(j|t)sx?$/,
            include: APP_PATH,
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
          },
          {
            test: /\.(jpg|jpeg|bmp|png|webp|gif|svg|cur)$/,
            loader: 'url-loader',
            options: {
              limit: 8 * 1024,
              name: 'img/[name].[hash:8].[ext]',
              outputPath: config.assetsDirectory,
              publicPath: config.assetsRoot
            }
          },
          {
            exclude: [/\.(js|mjs|ts|tsx|less|css|jsx)$/, /\.html$/, /\.json$/],
            loader: 'file-loader',
            options: {
              name: 'media/[path][name].[hash:8].[ext]',
              outputPath: config.assetsDirectory,
              publicPath: config.assetsRoot
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.json', '.jsx', '.ts', '.tsx'], // 自动判断后缀名，引入时可以不带后缀\
    alias: {
      '@': path.resolve(__dirname, '../lib/')
    }
  },
  plugins: [new CleanWebpackPlugin()]
};
