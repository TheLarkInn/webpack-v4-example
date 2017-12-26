const path = require('path');
const ProfilingPlugin = require('./ProfilingPlugin');

function webpackConfigWithEnv(env) {
  return {
    entry: {
      main: './src'
    },
    output: {
      path: path.join(__dirname, 'dist'),
      filename: '[name].bundle.js'
    },
    module: {
      rules: [

      ]
    },
    mode: "production",
    plugins: [
      new ProfilingPlugin()
    ]
  };
};


module.exports = webpackConfigWithEnv;
