import { buildSync } from 'esbuild'

build({
  entryPoints: ['builds/cdn.js'],
  outfile: 'dist/alpine-rc.min.js',
})

build({
  entryPoints: ['builds/module.js'],
  outfile: 'dist/alpine-rc.esm.js',
  platform: 'neutral',
  mainFields: ['main', 'module'],
})

function build(options) {
  return buildSync({ ...options, bundle: true, minify: true })
}
