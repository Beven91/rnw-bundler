/**
 * 名称：Webpack打包客户端
 * 日期：2016-11-02
 * 描述：用于进行客户端代码打包，或者开发时使用热部署，进行自动更新
 */

// 添加搜索路径
module.paths.unshift(require('path').resolve('node_modules'))

var path = require('path')
var webpack = require('webpack')
var dantejs = require('dantejs')
var config = require('../rnw-config.js')
var Options = require('../helpers/options');
var Arrays = dantejs.Array

// webpack plugins
var RequireImageXAssetPlugin = require('image-web-loader').RequireImageXAssetPlugin
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
var HappyPack = require('happypack')
var RuntimeCapturePlugin = require('./plugin/capture.js');
var ProgressBarPlugin = require('progress-bar-webpack-plugin')
var CleanWebpackPlugin = require('clean-webpack-plugin')
var CodeSpliterPlugin = require('webpack-code-spliter').CodeSpliterPlugin;
var Split = CodeSpliterPlugin.configure(config.splitRoutes, config.indexWebDir, 'pages', config.splitHandle)

var isProudction = process.env.NODE_ENV === 'production'
// 公用资源存放目录
var assetDir = config.assetsDir
var hasCommonChunks = config.commonChunks.length > 0;

// 开发环境plugins
var devPlugins = [
  new webpack.HotModuleReplacementPlugin()
]

// 生产环境plugins
var proPlugins = [
  new CleanWebpackPlugin(assetDir, { root: config.releaseDir }),
  new BundleAnalyzerPlugin({
    analyzerMode: 'static',
    openAnalyzer: false
  }),
  new webpack.optimize.UglifyJsPlugin({
    compressor: {
      warnings: false
    },
    sourceMap: true
  })
]

module.exports = Options.merge({
  devtool: isProudction ? 'source-map' : 'cheap-module-source-map',
  name: 'react-native-web client-side', // 配置名称
  context: path.dirname(config.clientContextEntry), // 根目录
  stats: config.isDebug ? 'detailed' : 'errors-only',
  entry: {
    app: Arrays.filterEmpty([
      './' + path.basename(config.clientContextEntry),
      isProudction ? undefined : 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000&reload=true'
    ]),
    common: config.commonChunks
  },
  output: {
    path: config.assetsAppDir,
    filename: '[name].js',
    chunkFilename: '[name]',
    publicPath: config.publicPath
  },
  plugins: [
    new ProgressBarPlugin(),
    new RequireImageXAssetPlugin(config.imageAssets),
    new HappyPack(config.happyPack),
    new RuntimeCapturePlugin(),
    new CodeSpliterPlugin(isProudction ? config.releaseDir : null),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        RNW_RUNTIME: JSON.stringify('Client'),
        NODE_ENV: JSON.stringify(isProudction ? 'production' : 'development')
      }
    }),
    new webpack.optimize.CommonsChunkPlugin('common')
  ].concat(isProudction ? proPlugins : devPlugins),
  module: {
    loaders: [
      {
        // jsx 以及js es6
        test: /\.js$|\.jsx$/,
        loader: require.resolve('happypack/loader') + '?id=happybabel',
        exclude: config.babelRc.ignore
      },
      {
        //代码拆分
        test: /\.js$|\.jsx$/,
        include: Split.includes,
        loader: [
          {
            loader: Split.loader,
            options: Split.options
          },
          {
            loader: 'babel-loader',
            options: {
              presets: config.babelRc.presets,
              plugins: config.babelRc.plugins,
              babelrc: config.babelRc.babelrc,
            }
          }
        ],
      },
      {
        // 图片类型模块资源访问
        test: /\.(png|jpg|jpeg|gif|webp|bmp|ico|jpeg)$/,
        loader: [
          {
            loader: 'image-web-loader',
            options: config.minOptions
          },
          {
            loader: 'file-loader'
          }
        ]
      },
      {
        // url类型模块资源访问
        test: new RegExp('\\' + config.static.join('$|\\') + '$'),
        loader: 'url-loader',
        query: {
          name: '[hash].[ext]',
          limit: 10000
        }
      },
      {
        // json类型模块处理
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  },
  resolveLoader: {
    modules: [
      path.resolve('node_modules'),
      path.resolve('../node_modules'),
      path.join(__dirname, '../../../')
    ]
  },
  resolve: {
    modules: [
      'node_modules',
      path.join(__dirname, '../../../'),
    ],
    alias: config.alias,
    extensions: config.extensions
  }
}, config.webpack);

if (!hasCommonChunks) {
  delete module.exports.entry.common;
}
