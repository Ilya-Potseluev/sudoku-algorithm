import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import path from 'path';
import webpack from 'webpack';

const filename = ext => (isDev ? `[name].${ext}` : `[name].[fullhash].${ext}`);
const cssLoaders = extra => {
	let loaders = [
		{
			loader: MiniCssExtractPlugin.loader,
		},
		'css-loader',
	];
	if (extra) loaders.push(extra);
	return loaders;
};

const isDev = true || process.env.NODE_ENV === 'development';
let publicPath = process.env.SITE_PATH ?? '/';

/** @type { import('webpack-dev-server').Configuration } */
let devServer = {
	static: {
		directory: path.join(__dirname, 'www'),
		watch: true,
	},
	compress: false,
	port: 8080,
};

/** @type { import('webpack').Configuration } */
let config = {
	entry: ['./www/index.ts'],
	output: {
		publicPath,
		path: path.resolve(__dirname, 'dist'),
		filename: filename('js'),
	},
	mode: isDev ? 'development' : 'production',
	devtool: 'source-map',
	plugins: [
		new HTMLWebpackPlugin({
			template: './www/index.html',
		}),
		new MiniCssExtractPlugin({
			filename: filename('css'),
		}),
		new CleanWebpackPlugin(),
		new webpack.IgnorePlugin({
			resourceRegExp: /node:fs/,
		}),
	],
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	module: {
		rules: [
			/*{
				test: /\.json$/,
				use: 'ts-loader',
			},*/
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.html$/i,
				loader: 'html-loader',
			},
			{
				test: /\.css$/,
				use: cssLoaders(),
			},
			{
				test: /\.s[ac]ss$/,
				use: cssLoaders('sass-loader'),
			},
			{
				test: /\.(png|svg|jpg|jpeg|gif)$/i,
				type: 'asset/resource',
			},
			{
				test: /\.(woff|woff2|eot|ttf|otf)$/i,
				type: 'asset/resource',
			},
			{
				test: /\.txt$/i,
				use: 'raw-loader',
			},
		],
	},
	experiments: {
		topLevelAwait: true,
		asyncWebAssembly: true,
	},
	devServer,
};

export default config;
