const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './example/index.ts',
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: 'pulsoid-socket',
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  optimization: {
    splitChunks: {
      name: 'vendor',
      minChunks: 2,
    },
  },
  devServer: {
    bonjour: true,
  },
  plugins: [new HtmlWebpackPlugin()],
  mode: 'development',
};
