import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

type CliOptions = {
  out: string
}

type GrammarSample = {
  key: string
  label: string
  input: string
  whyItMatters: string
}

type SampleResult = GrammarSample & {
  tokens: string[]
  parseOk: boolean
  parseError: string | null
}

const DEFAULT_OUT =
  'reference/song-publish-candidates/review-notes/hc-parser-grammar-analysis-2026-05-13.md'

const usage =
  `Usage: node --experimental-strip-types --experimental-specifier-resolution=node scripts/analyze-hc-parser-grammar.ts [--out=${DEFAULT_OUT}]`

const options = parseArgs(process.argv.slice(2))
if (!options) {
  console.error(usage)
  process.exit(1)
}

const require = createRequire(import.meta.url)
const hc = require('../public/k-static/cdn/js/dist/hc.min_1cfae5fe62.js') as {
  parser: {
    terminals_: Record<number, string>
    symbols_: Record<string, number>
    lexer: {
      rules: RegExp[]
      setInput: (input: string, yy: unknown) => void
      lex: () => number
      yytext: string
    }
    yy: unknown
  }
  parse: (input: string) => unknown
}

const samples: GrammarSample[] = [
  {
    key: 'compositional-note',
    label: 'Composable note tokens',
    input: "1x2'3,4#|",
    whyItMatters:
      'Confirms that pitch, octave, accidentals, and duration are separate adjacent tokens, not one giant hard-coded note token.'
  },
  {
    key: 'metadata-directive',
    label: 'Key/value directives',
    input: '{bpm:100}{cn:C}123|',
    whyItMatters:
      'Shows native metadata/chord directives are first-class syntax families and should not be flattened into lyric/noise.'
  },
  {
    key: 'lyric-text-annotation',
    label: 'Embedded text-like blocks',
    input: '{lyric}la la{/lyric}{text}Fine{/text}{"rit."}{\'mf\'}{!...!}{3/4}123|',
    whyItMatters:
      'Confirms lyric/text/annotation/comment/temp-time-signature blocks are real lexer tokens.'
  },
  {
    key: 'repeat-grammar',
    label: 'Repeat and ending grammar',
    input: '[1:12]:|',
    whyItMatters:
      'Confirms numbered-ending syntax is engine-native grammar instead of loose textual decoration.'
  },
  {
    key: 'tuplet-slur',
    label: 'Tuplet/slur structure',
    input: '(3:123)',
    whyItMatters:
      'Confirms tuplet-like heads need a matching structural close; emitting half-open forms would be invalid.'
  },
  {
    key: 'appoggiatura-and-pairs',
    label: 'Appoggiatura / pair wrappers',
    input: '@(123)(12)@{>12>}{~12~}{=12=}{-12-}{+12+}{{12}}',
    whyItMatters:
      'Confirms several grouped wrapper forms are parsed structurally and are not safe to imitate blindly.'
  }
]

const sampleResults = samples.map(sample => analyzeSample(hc, sample))
const terminals = Object.entries(hc.parser.symbols_)
  .filter(([symbol]) => !symbol.startsWith('$'))
  .sort((left, right) => left[1] - right[1])

const markdown = buildMarkdown({
  generatedOn: new Date().toISOString(),
  exports: Object.keys(hc),
  terminalCount: Object.keys(hc.parser.terminals_).length,
  lexerRuleCount: hc.parser.lexer.rules.length,
  terminals,
  lexerRulePreview: hc.parser.lexer.rules.slice(0, 20).map(rule => String(rule)),
  sampleResults
})

const outPath = path.resolve(process.cwd(), options.out)
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, markdown, 'utf8')

console.log(`Wrote HC parser grammar analysis to ${path.relative(process.cwd(), outPath)}`)
console.log(
  JSON.stringify(
    {
      exports: Object.keys(hc),
      terminalCount: Object.keys(hc.parser.terminals_).length,
      lexerRuleCount: hc.parser.lexer.rules.length,
      parseOkSamples: sampleResults.filter(sample => sample.parseOk).map(sample => sample.key)
    },
    null,
    2
  )
)

function parseArgs(args: string[]): CliOptions | null {
  const values = new Map<string, string>()

  args.forEach(arg => {
    const match = arg.match(/^--([^=]+)=(.*)$/)
    if (!match) {
      return
    }

    values.set(match[1], match[2])
  })

  return {
    out: values.get('out') || DEFAULT_OUT
  }
}

function analyzeSample(
  hcModule: typeof hc,
  sample: GrammarSample
): SampleResult {
  const lexer = hcModule.parser.lexer
  lexer.setInput(sample.input, hcModule.parser.yy)
  const tokens: string[] = []

  while (true) {
    const token = lexer.lex()
    const label = hcModule.parser.terminals_[token] || String(token)
    tokens.push(`${label}:${JSON.stringify(lexer.yytext)}`)
    if (token === 1) {
      break
    }
  }

  try {
    hcModule.parse(sample.input)
    return {
      ...sample,
      tokens,
      parseOk: true,
      parseError: null
    }
  } catch (error) {
    return {
      ...sample,
      tokens,
      parseOk: false,
      parseError: error instanceof Error ? error.message : String(error)
    }
  }
}

function buildMarkdown(input: {
  generatedOn: string
  exports: string[]
  terminalCount: number
  lexerRuleCount: number
  terminals: Array<[string, number]>
  lexerRulePreview: string[]
  sampleResults: SampleResult[]
}) {
  const terminalPreview = input.terminals
    .map(([symbol, id]) => `- ${id}: \`${symbol}\``)
    .join('\n')

  const sampleSections = input.sampleResults
    .map(sample => {
      const status = sample.parseOk ? 'parse ok' : `parse error: ${sample.parseError}`
      const tokenLines = sample.tokens.map(token => `- ${token}`).join('\n')
      return `### ${sample.label}

- Input: \`${sample.input}\`
- Status: ${status}
- Why it matters: ${sample.whyItMatters}
- Lexer tokens:
${tokenLines}`
    })
    .join('\n\n')

  const lexerPreview = input.lexerRulePreview.map(rule => `- \`${escapeBackticks(rule)}\``).join('\n')

  return `# HC Parser Grammar Analysis (${input.generatedOn.slice(0, 10)})

- Runtime export keys: ${input.exports.map(value => `\`${value}\``).join(', ')}
- Terminal count: ${input.terminalCount}
- Lexer rule count: ${input.lexerRuleCount}
- Goal: use the bundled HC parser as a truth source for native Kuailepu grammar instead of inferring everything from rendered pages alone.

## What This Confirms

- \`hc\` is a parser + lexer, not just an SVG renderer.
- Note syntax is compositional: a note such as \`1x\` is tokenized as \`SCALE("1") + KEYWORD("x")\`.
- Octave aliases like \`'\`, \`,\`, and \`"\` are engine-native equivalents of the normalized \`g\` / \`d\` forms we prefer to emit.
- Curly-brace blocks are not one generic bucket: lyric/text/annotation/comment/temp-time-signature/chord/key-value families each have dedicated token types.
- Repeat grammar, grouped wrappers, tuplet heads, and appoggiatura-like wrappers are structural syntax; if we later emit them, we need well-formed pairs instead of loose text snippets.

## Terminal Inventory

${terminalPreview}

## Verified Samples

${sampleSections}

## Lexer Rule Preview

${lexerPreview}

## Immediate Converter Implications

- Keep our XML -> Kuailepu generator on a normalized subset, but model that subset as adjacent syntax pieces rather than whole-note regex guesses.
- Accept engine-native octave aliases and suffix accidentals in local analysis/parsing helpers so overlap training is not polluted by avoidable parser mismatches.
- Treat repeat grammar, tuplets, slurs, and grouped wrappers as future structured-emission features, not as free-form string decorations.
- Treat \`{bpm:...}\`, \`{cn:...}\`, \`{lyric}...{/lyric}\`, \`{text}...{/text}\`, and similar blocks as first-class syntax families when auditing source quality or simplifying imported notation.
`
}

function escapeBackticks(value: string) {
  return value.replace(/`/g, '\\`')
}
