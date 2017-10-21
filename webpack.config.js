const path = require('path');

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
    plugins: [

    ],
    target: "node"
  };
};



module.exports = webpackConfigWithEnv;
