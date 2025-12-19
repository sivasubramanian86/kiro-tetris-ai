import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public'),
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  target: 'web',
  resolve: {
    fallback: {
      "path": false,
      "fs": false,
      "crypto": false,
      "stream": false,
      "util": false,
      "url": false,
      "querystring": false,
      "http": false,
      "https": false,
      "zlib": false,
      "os": false,
      "buffer": false,
      "net": false,
      "tls": false,
      "async_hooks": false,
      "process": false,
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'typeof window': JSON.stringify('object'),
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^(express|cors|helmet|dotenv)$/,
    }),
  ],
  externals: {
    express: 'commonjs express',
    cors: 'commonjs cors',
    helmet: 'commonjs helmet',
    dotenv: 'commonjs dotenv',
  },
  mode: 'production',
};