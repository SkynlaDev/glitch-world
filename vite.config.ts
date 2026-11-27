import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  test: { exclude: [...configDefaults.exclude, '.claude/**'] },
});
