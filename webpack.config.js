const HtmlWebPackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const path = require("path");
const Dotenv = require("dotenv-webpack");

const deps = require("./package.json").dependencies;
const printCompilationMessage = require("./compilation.config.js");

module.exports = (_, argv) => ({
  output: {
    publicPath: "http://localhost:8091/",
    clean: true, // Ensure the output directory is cleaned before each build
  },

  resolve: {
    extensions: [".tsx", ".ts", ".jsx", ".js", ".json"],
  },

  devServer: {
    port: 8091,
    historyApiFallback: true,
    hot: true, // Enable HMR (Hot Module Replacement) for development
    watchFiles: [path.resolve(__dirname, "src")],
    onListening: function (devServer) {
      const port = devServer.server.address().port;

      printCompilationMessage("compiling", port);

      devServer.compiler.hooks.done.tap("OutputMessagePlugin", (stats) => {
        setImmediate(() => {
          if (stats.hasErrors()) {
            printCompilationMessage("failure", port);
          } else {
            printCompilationMessage("success", port);
          }
        });
      });
    },
  },

  module: {
    rules: [
      // Handle images and binary files
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i, // Match image files
        type: "asset/resource", // Use Webpack 5's built-in asset module
        generator: {
          filename: "images/[name][ext]", // Output images to the "images/" directory
        },
      },
      {
        test: /\.(mp3|wav|ogg|flac)$/i, // Match audio files
        type: "asset/resource",
        generator: {
          filename: "audio/[name][ext]", // Output audio files to the "audio/" directory
        },
      },

      // JavaScript (ES6 and JSX) files handling
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },

      // CSS handling
      {
        test: /\.(css|s[ac]ss)$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
    ],
  },

  plugins: [
    new ModuleFederationPlugin({
      name: "kta_utchol",
      filename: "remoteEntry.js",
      remotes: {},
      exposes: {
        "./App": "./src/main.jsx",
      },
      shared: {
        ...deps,
        react: {
          singleton: true,
          requiredVersion: deps.react,
        },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
        },
      },
    }),

    new HtmlWebPackPlugin({
      template: "./src/index.html",
    }),

    new Dotenv(),
  ],
}); 

