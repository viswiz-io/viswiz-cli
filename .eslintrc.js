module.exports = {
	env: {
		es6: true,
		node: true,
		jest: true,
	},
	extends: 'eslint:recommended',
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: 'module',
	},
	rules: {
		indent: ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		'no-else-return': ['error'],
		'no-unused-vars': ['error', { ignoreRestSiblings: true }],
		quotes: ['error', 'single'],
		'prefer-arrow-callback': ['error'],
		'prefer-const': ['error'],
		semi: ['error', 'always'],
	},
};
