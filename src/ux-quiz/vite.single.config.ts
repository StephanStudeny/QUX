import { mergeConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import base from './vite.config'

/**
 * Однофайловая сборка (весь JS/CSS/картинки внутри index.html): открывается через file://.
 * Нужна для проверок ui-gate и чтобы показать сборку без сервера. `npm run build:single`.
 */
export default mergeConfig(base, {
  plugins: [viteSingleFile()],
  build: { outDir: 'dist-single', assetsInlineLimit: 100_000_000 },
})
