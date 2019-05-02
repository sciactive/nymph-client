const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    NymphClient: './src/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: ['nymph-client'],
    libraryTarget: 'umd',
    globalObject: 'this'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              ['@babel/transform-classes', {
                builtins: ['Error']
              }]
            ]
          }
        }
      }
    ]
  }
};
