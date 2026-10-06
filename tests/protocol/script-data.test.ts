import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { StaticValue } from '../../src/index.ts'
import { ErrorCode, ScriptData, handlerProgram, object } from '../../src/index.ts'

function scriptsOf(...sources: string[]): ScriptData {
  return new ScriptData(sources)
}

void test('a static object is read as data, and anything else is refused', () => {
  assert.deepEqual(object({ a: '1', b: ['2'] }), { a: '1', b: ['2'] })

  assert.deepEqual(object({}), {})

  const refused: (StaticValue | undefined)[] = [undefined, null, 'text', false, ['a']]
  refused.forEach((value, index) => {
    assert.throws(
      () => object(value),
      { code: ErrorCode.ParseError, message: 'Expected static object' },
      `value ${index}`,
    )
  })
})

void test('a handler is decoded as the function body a browser would run', () => {
  assert.equal(handlerProgram('doit(1)'), 'function handler(){\ndoit(1)\n}')

  assert.equal(handlerProgram('doit(1) // now'), 'function handler(){\ndoit(1) // now\n}')
})

void test('a value the page can state is read as the value it states', () => {
  assert.deepEqual(scriptsOf('a("text", true, false, null)').calls('a'), [
    ['text', true, false, null],
  ])
})

void test('a number keeps the source text it was written with', () => {
  assert.deepEqual(scriptsOf('a(12, 0.5, 1e3, -3, +4, 9007199254740993)').calls('a'), [
    ['12', '0.5', '1e3', '-3', '+4', '9007199254740993'],
  ])
})

void test('Unicode before data leaves its numeric source offsets intact', () => {
  const scripts = scriptsOf(
    '/* 中文😀 */ var data = {"名😀": 9007199254740993, exponent: 1e3, negative: -0xFF}; receive(9007199254740993, "文字😀");',
  )
  assert.deepEqual(scripts.binding('data'), {
    '名😀': '9007199254740993',
    exponent: '1e3',
    negative: '-0xFF',
  })
  assert.deepEqual(scripts.calls('receive'), [['9007199254740993', '文字😀']])
  assert.deepEqual(
    scripts.memberNumbers('/* 中文😀 */ return Dialog.info(9007199254740993);', 'info'),
    ['9007199254740993'],
  )
  assert.equal(scripts.memberText('/* 中文😀 */ return Dialog.text("文字😀");', 'text'), '文字😀')
})

void test('parentheses leave static values readable', () => {
  const scripts = scriptsOf('var data = ({price: (12)}); receive((1), ({value: (2)}));')
  assert.deepEqual(scripts.binding('data'), { price: '12' })
  assert.deepEqual(scripts.calls('receive'), [['1', { value: '2' }]])
})

void test('a literal that names a value rather than stating one is executable, not data', () => {
  const executable: [string, string][] = [
    ['a(/pattern/)', 'Executable data is not supported: Literal'],
    ['a(1n)', 'Executable data is not supported: Literal'],
    ['a(`template`)', 'Executable data is not supported: TemplateLiteral'],
    ['a(x)', 'Executable data is not supported: Identifier'],
    ['a(x.y)', 'Executable data is not supported: MemberExpression'],
    ['a(x())', 'Executable data is not supported: CallExpression'],
  ]
  for (const [source, message] of executable)
    assert.throws(
      () => scriptsOf(source).calls('a'),
      { code: ErrorCode.ParseError, message },
      source,
    )
})

void test('a unary operator other than a sign names a value the page computed', () => {
  for (const source of ['a(-"1")', 'a(-x)', 'a(!0)', 'a(~1)', 'a(typeof x)'])
    assert.throws(
      () => scriptsOf(source).calls('a'),
      { code: ErrorCode.ParseError, message: 'Executable data is not supported: UnaryExpression' },
      source,
    )
})

void test('a list is read entry by entry', () => {
  assert.deepEqual(scriptsOf('a([])').calls('a'), [[[]]])
  assert.deepEqual(scriptsOf('a([1, "x", [true]])').calls('a'), [[['1', 'x', [true]]]])

  assert.throws(() => scriptsOf('a([1, , 2])').calls('a'), {
    code: ErrorCode.ParseError,
    message: 'Non-static array entry',
  })
  assert.throws(() => scriptsOf('a([...x])').calls('a'), {
    code: ErrorCode.ParseError,
    message: 'Non-static array entry',
  })
})

void test('an object is read key by key', () => {
  assert.deepEqual(scriptsOf('a({})').calls('a'), [[{}]])

  assert.deepEqual(scriptsOf('a({x: 1, "y-z": "s", 7: true})').calls('a'), [
    [{ x: '1', 'y-z': 's', 7: true }],
  ])
})

void test('an object whose keys are not plain data is refused', () => {
  const computed: [string, string][] = [
    ['a({get x(){ return 1 }})', 'Non-static object property'],
    ['a({set x(v){}})', 'Non-static object property'],
    ['a({[k]: 1})', 'Non-static object property'],
    ['a({m(){ return 1 }})', 'Non-static object property'],
    ['a({x})', 'Non-static object property'],
    ['a({x: 1, x: 2})', 'Duplicate data key'],
  ]
  for (const [source, message] of computed)
    assert.throws(
      () => scriptsOf(source).calls('a'),
      { code: ErrorCode.ParseError, message },
      source,
    )
})

void test('a key the page wrote as __proto__ stays data rather than a prototype', () => {
  const decoded: StaticValue = scriptsOf('a({__proto__: {x: 1}})').calls('a')[0]![0]!

  assert.equal(JSON.stringify(decoded), '{"__proto__":{"x":"1"}}')
  assert.equal(Object.getPrototypeOf(decoded), Object.prototype)
})

void test('decoded objects retain the writable data properties promised by their type', () => {
  const decoded = object(scriptsOf('var item = {price: 1}').binding('item'))
  decoded.price = '2'
  assert.equal(decoded.price, '2')
  delete decoded.price
  assert.deepEqual(decoded, {})
})

void test('data nested past what a decoder will follow is refused', () => {
  assert.throws(() => scriptsOf(`a(${'['.repeat(70)}${']'.repeat(70)})`).calls('a'), {
    code: ErrorCode.ParseError,
    message: /Static data is too deeply nested/,
  })
})

void test('a script nested past what the walk will follow is refused', () => {
  assert.throws(() => scriptsOf(`var a = ${'['.repeat(200)}${']'.repeat(200)}`).calls('a'), {
    code: ErrorCode.ParseError,
    message: /Script is too deeply nested/,
  })
})

void test('a call argument the page computed has no static value', () => {
  assert.throws(() => scriptsOf('a(1, b(2))').calls('a'), {
    code: ErrorCode.ParseError,
    message: 'Executable data is not supported: CallExpression',
  })
  assert.throws(() => scriptsOf('a(...rest)').calls('a'), {
    code: ErrorCode.ParseError,
    message: 'Non-static call argument',
  })
})

void test('every call of a name is read, in the order the script makes them', () => {
  assert.deepEqual(scriptsOf('a(1); a(2); b(3);').calls('a'), [['1'], ['2']])

  assert.deepEqual(scriptsOf('outer(inner(1))').calls('inner'), [['1']])

  assert.deepEqual(scriptsOf('Dialog.a(1)').calls('a'), [])
})

void test('a script that does not parse is a failure where a reader asked about it', () => {
  assert.deepEqual(scriptsOf('this is not (', 'b(1)').calls('b'), [['1']])
  assert.throws(() => scriptsOf('a = (').calls('a'), {
    code: ErrorCode.ParseError,
    message: 'Invalid script',
  })
})

void test('invalid bindings and control flow do not become readable script data', () => {
  const invalid = [
    'let data = 1; let data = 2;',
    'const data = 1; const data = 2;',
    'break; var data = 1;',
    'continue; var data = 1;',
    'class C { method(){ this.#missing; } } var data = 1;',
  ]
  for (const source of invalid) {
    assert.throws(
      () => scriptsOf(source).binding('data'),
      { code: ErrorCode.ParseError, message: 'Invalid script' },
      source,
    )
    assert.equal(scriptsOf(source).snapshot().unparsed.length, 1, source)
  }
})

void test('a name is matched as a word of its own', () => {
  for (const source of ['var amounts = 1', 'var xamount = 1', 'var other = 1'])
    assert.throws(
      () => scriptsOf(source).binding('amount'),
      { code: ErrorCode.ParseError, message: 'Expected one amount binding, found 0' },
      source,
    )

  assert.equal(scriptsOf('var amountX = 1; var amount = 2;').binding('amount'), '2')

  assert.equal(scriptsOf('amount = 1').binding('amount'), '1')

  assert.throws(() => scriptsOf('var total = amount').binding('amount'), {
    code: ErrorCode.ParseError,
    message: 'Expected one amount binding, found 0',
  })
})

void test('a binding is read from its declaration or its assignment', () => {
  assert.equal(scriptsOf('var a = 1').binding('a'), '1')
  assert.equal(scriptsOf('let a = "text"').binding('a'), 'text')
  assert.deepEqual(scriptsOf('const a = [1, 2]').binding('a'), ['1', '2'])
  assert.equal(scriptsOf('a = true').binding('a'), true)
})

void test('a binding the script does not state exactly once has no single reading', () => {
  assert.throws(() => scriptsOf('var a = 1; a = 2').binding('a'), {
    code: ErrorCode.ParseError,
    message: /Expected one a binding, found 2/,
  })

  assert.equal(scriptsOf('var a = 1; a = 2').binding('a', 'last'), '2')
  assert.equal(scriptsOf('a = 7').binding('a', 'last'), '7')
  assert.throws(() => scriptsOf('var b = 1').binding('a'), {
    code: ErrorCode.ParseError,
    message: /Expected one a binding, found 0/,
  })
  assert.throws(() => scriptsOf('var b = 1').binding('a', 'last'), {
    code: ErrorCode.ParseError,
    message: /Expected at least one a binding, found 0/,
  })
})

void test('a declaration that binds no single name states no binding', () => {
  const snapshot = scriptsOf(
    'var missing; var { picked } = data; let [first] = list; var ok = 1; count += 1;',
  ).snapshot()

  assert.deepEqual(snapshot.bindings, [{ name: 'ok', data: '1' }])
})

void test('a member call is read for the number its argument states', () => {
  const scripts = scriptsOf('x')
  assert.deepEqual(scripts.memberNumbers('Dialog.Playercard(4242)', 'Playercard'), ['4242'])

  assert.deepEqual(
    scripts.memberNumbers('check(); return Dialog.Playercard(4242);', 'Playercard'),
    ['4242'],
  )

  assert.deepEqual(scripts.memberNumbers('a.F(1); a.F(2);', 'F'), ['1', '2'])
  assert.deepEqual(scripts.memberNumbers('a.G(1)', 'F'), [])
  assert.deepEqual(scripts.memberNumbers(undefined, 'F'), [])
})

void test('a member call is read for the text its argument states', () => {
  const scripts = scriptsOf('x')
  assert.equal(scripts.memberText('Dialog.setSubject("Homeworld")', 'setSubject'), 'Homeworld')

  assert.equal(scripts.memberText('a.F("x"); a.F("y")', 'F'), null)
  assert.equal(scripts.memberText('a.F(1)', 'F'), null)
  assert.equal(scripts.memberText('a.F()', 'F'), null)
  assert.equal(scripts.memberText('a.G("x")', 'F'), null)
  assert.equal(scripts.memberText(undefined, 'F'), null)
})

void test('a member call is found only where the member is named the way the reader asks', () => {
  const scripts = scriptsOf('x')

  assert.deepEqual(scripts.memberNumbers('a["F"](1)', 'F'), [])

  assert.deepEqual(scripts.memberNumbers('F(1)', 'F'), [])
  assert.deepEqual(scripts.memberNumbers('class C { #F(){} m(){ D.#F(1) } }', 'F'), [])

  assert.deepEqual(scripts.memberNumbers('a.F("1")', 'F'), [])
})

void test('a handler that does not parse carries no readable call', () => {
  const scripts = scriptsOf('x')
  assert.deepEqual(scripts.memberNumbers('Dialog.Playercard(]x);', 'Playercard'), [])
  assert.equal(scripts.memberText('Dialog.setSubject("unterminated', 'setSubject'), null)
})

void test('a script is parsed once however many readers ask about it', () => {
  const scripts = scriptsOf('var a = 1; a(2)')
  assert.equal(scripts.binding('a'), '1')
  assert.deepEqual(scripts.calls('a'), [['2']])

  assert.equal(scripts.binding('a'), '1')
  assert.deepEqual(scripts.calls('a'), [['2']])

  assert.throws(() => scripts.binding('zzz'), {
    code: ErrorCode.ParseError,
    message: 'Expected one zzz binding, found 0',
  })
})

void test('a snapshot lists the data the whole response carries', () => {
  const snapshot = scriptsOf(
    'var active = true;',
    'var pending = compute(); var total = 12;',
    'tick(1, "a"); tick(side); paint(...layers);',
  ).snapshot()
  assert.deepEqual(snapshot.bindings, [
    { name: 'active', data: true },
    { name: 'total', data: '12' },
  ])

  assert.deepEqual(snapshot.expressions, [{ name: 'pending', source: 'compute()' }])
  assert.deepEqual(snapshot.calls, [
    { name: 'compute', arguments: [] },
    { name: 'tick', arguments: ['1', 'a'] },
  ])

  assert.deepEqual(snapshot.skippedCalls, [
    { scriptIndex: 2, name: 'tick' },
    { scriptIndex: 2, name: 'paint' },
  ])
  assert.deepEqual(snapshot.unparsed, [])
})

void test('a script that does not parse is listed rather than refused', () => {
  const snapshot = scriptsOf('var a = 1;', 'not a script (').snapshot()
  assert.equal(snapshot.unparsed.length, 1)

  assert.equal(snapshot.unparsed[0]!.scriptIndex, 1)

  assert.ok(snapshot.unparsed[0]!.message.length > 0)
  assert.doesNotMatch(snapshot.unparsed[0]!.message, /SyntaxError/)

  assert.deepEqual(snapshot.bindings, [{ name: 'a', data: '1' }])
})

void test('a snapshot is taken once and handed back to every caller', () => {
  const scripts = scriptsOf('var a = 1;')
  assert.equal(scripts.snapshot(), scripts.snapshot())
})

void test('the data a reader gets back is the shape its reader asked for', () => {
  const value: StaticValue = scriptsOf('a({deep: [null, {x: true}]})').calls('a')[0]![0]!
  assert.deepEqual(value, { deep: [null, { x: true }] })
})
