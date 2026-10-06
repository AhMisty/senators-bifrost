import { defineConfig } from 'rolldown'
import type { RolldownOptions } from 'rolldown'
import { dts } from 'rolldown-plugin-dts'

const config: RolldownOptions = defineConfig({
  input: {
    index: './src/index.ts',
    game: './src/game.ts',
    rules: './src/rules.ts',
    admin: './src/admin.ts',
    public: './src/public.ts',
  },
  platform: 'node',
  external: /^[^./](?!:[/\\])/,
  plugins: [dts({ generator: 'oxc', sourcemap: true })],
  output: {
    dir: 'out',
    format: 'es',
    cleanDir: true,
    minify: true,
    /**
     * Library sources ship in src/; maps retain locations without embedding content.
     *
     * 本库源码随 src/ 发布；映射保留位置，不重复内嵌源码。
     */
    sourcemapExcludeSources: true,
  },
})

export default config
