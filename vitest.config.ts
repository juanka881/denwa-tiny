import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
	test: {
		coverage: {
			reportsDirectory: 'dist/coverage',
			provider: 'istanbul'
		}
	},
	plugins: [
		swc.vite()
	]
})
