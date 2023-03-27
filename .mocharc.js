module.exports = {
	require: [
		'source-map-support/register',
		'ts-node/register',
	],
	extensions: [
		'ts',
		'tsx',
	],
	spec: [
		'test/**/*.test.*',
	],
	'watch-files': [
		'src',
		'test',
	],
};
