import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { isBuiltin } from 'node:module'
import { test } from 'node:test'

/**
 * Static imports, re-exports and literal dynamic imports.
 *
 * 静态导入、重导出和字面量动态导入。
 */
const MODULE_SPECIFIER = /(?:\bfrom|\bimport\(?)\s*["']([^\s"']+)["']/g

const root = new URL('../', import.meta.url)
const manifest: {
  name: string
  files: string[]
  exports: Record<string, { types: string; import: string }>
  dependencies: Record<string, string>
} = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))

void test('the package exposes its five public entry points', () => {
  assert.ok(manifest.files.includes('out'), 'The package does not publish its entry points')
  assert.deepEqual(Object.keys(manifest.exports).toSorted(), [
    '.',
    './admin',
    './game',
    './public',
    './rules',
  ])
})

for (const [entry, paths] of Object.entries(manifest.exports)) {
  const specifier = `${manifest.name}${entry === '.' ? '' : entry.slice(1)}`
  void test(`${specifier} publishes the source entry's runtime exports and declarations`, async () => {
    for (const path of [paths.types, paths.import])
      assert.ok(existsSync(new URL(path, root)), `Missing ${entry} export: ${path}`)
    const sourcePath = `src/${entry === '.' ? 'index' : entry.slice(2)}.ts`
    const source: Record<string, unknown> = await import(new URL(sourcePath, root).href)
    const bundled: Record<string, unknown> = await import(specifier)
    assert.deepEqual(Object.keys(bundled).toSorted(), Object.keys(source).toSorted())
    for (const name of Object.keys(source))
      assert.equal(typeof bundled[name], typeof source[name], `${specifier} exports ${name}`)
  })
}

void test('JavaScript and declarations resolve relative modules and use only declared dependencies or Node built-ins', () => {
  const out = new URL('out/', root)
  const chunks = readdirSync(out, { encoding: 'utf8', recursive: true }).filter(
    (name) => name.endsWith('.js') || name.endsWith('.d.ts'),
  )
  assert.ok(chunks.length > 0, 'The package has no bundled modules')
  for (const name of chunks)
    for (const match of readFileSync(new URL(name, out), 'utf8').matchAll(MODULE_SPECIFIER)) {
      const target = match[1]!
      if (target.startsWith('.')) {
        const relative = name.endsWith('.d.ts') ? target.replace(/\.js$/, '.d.ts') : target
        const resolved = new URL(relative, new URL(name, out))
        assert.ok(resolved.href.startsWith(out.href), `${name} imports outside out/: ${target}`)
        assert.ok(statSync(resolved).isFile(), `${name} cannot resolve ${target}`)
        continue
      }
      const declared = Object.keys(manifest.dependencies).some(
        (dependency) => target === dependency || target.startsWith(`${dependency}/`),
      )
      assert.ok(isBuiltin(target) || declared, `${name} imports ${target}`)
    }
})

void test('JavaScript and declaration maps resolve published source files without bundling dependencies', () => {
  const out = new URL('out/', root)
  const sources = new URL('src/', root)
  assert.ok(manifest.files.includes('src'), 'The package does not publish source-map targets')
  const maps = readdirSync(out).filter((name) => name.endsWith('.map'))
  assert.ok(maps.length > 0, 'The package has no source maps')
  for (const name of maps) {
    const address = new URL(name, out)
    const map: { file: string; sources: string[] } = JSON.parse(readFileSync(address, 'utf8'))
    assert.ok(statSync(new URL(map.file, address)).isFile(), `${name} has no generated file`)
    for (const source of map.sources) {
      assert.ok(!/(?:^|[/\\])node_modules(?:[/\\]|$)/.test(source), `${name} embeds ${source}`)
      const resolved = new URL(source, address)
      assert.ok(resolved.href.startsWith(sources.href), `${name} maps outside src/: ${source}`)
      assert.ok(statSync(resolved).isFile(), `${name} cannot resolve ${source}`)
    }
  }
  assert.equal(existsSync(new URL('THIRD_PARTY_NOTICES.txt', out)), false)
})
