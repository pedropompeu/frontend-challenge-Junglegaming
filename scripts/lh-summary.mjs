// Resume os relatórios do Lighthouse CI (lighthouse/reports/<perfil>) em lighthouse/summary.md:
// mediana das 3 execuções por página × perfil, mais versões, ambiente e condições de throttling.
// Só a região entre os marcadores é regerada; as justificativas escritas à mão ficam intactas.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import os from 'node:os'

const REPORTS = 'lighthouse/reports'
const SUMMARY = 'lighthouse/summary.md'
const PROFILES = ['mobile', 'desktop']
const START = '<!-- lh-summary:start -->'
const END = '<!-- lh-summary:end -->'
const GOALS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 }
const CATEGORIES = [
  ['performance', 'Perf'],
  ['accessibility', 'A11y'],
  ['best-practices', 'BP'],
  ['seo', 'SEO'],
]

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const score = (value, goal) => `${value}${value < goal ? ' ⚠' : ''}`
const ms = (value) => `${Math.round(value).toLocaleString('pt-BR')} ms`
const decimal = (value, digits) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

function loadProfile(profile) {
  const dir = join(REPORTS, profile)
  const manifestPath = join(dir, 'manifest.json')
  if (!existsSync(manifestPath)) throw new Error(`Sem ${manifestPath}: rode \`pnpm lighthouse\`.`)
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  // O lhci grava caminhos absolutos; relativos mantêm o manifest versionado válido em qualquer clone.
  const relative = manifest.map((entry) => ({
    ...entry,
    htmlPath: basename(entry.htmlPath),
    jsonPath: basename(entry.jsonPath),
  }))
  writeFileSync(manifestPath, `${JSON.stringify(relative, null, 2)}\n`)
  return relative.map((entry) => JSON.parse(readFileSync(join(dir, entry.jsonPath), 'utf8')))
}

function summarize(lhrs) {
  const byPage = Map.groupBy(lhrs, (lhr) => new URL(lhr.requestedUrl).pathname)
  return [...byPage].map(([page, runs]) => ({
    page,
    runs: runs.length,
    ...Object.fromEntries(
      CATEGORIES.map(([id]) => [
        id,
        Math.round(median(runs.map((r) => r.categories[id].score)) * 100),
      ]),
    ),
    lcp: median(runs.map((r) => r.audits['largest-contentful-paint'].numericValue)),
    cls: median(runs.map((r) => r.audits['cumulative-layout-shift'].numericValue)),
    tbt: median(runs.map((r) => r.audits['total-blocking-time'].numericValue)),
  }))
}

function conditions(lhr) {
  const s = lhr.configSettings
  const t = s.throttling
  const screen = s.screenEmulation
  const device = `${s.formFactor}, ${screen.width}×${screen.height} @${screen.deviceScaleFactor}x`
  const network = `RTT ${t.rttMs} ms, ${decimal(t.throughputKbps / 1024, 1)} Mbps`
  return `${device}; throttling \`${s.throttlingMethod}\` (${network}, CPU ${t.cpuSlowdownMultiplier}×)`
}

const sections = []
let sample
for (const profile of PROFILES) {
  const lhrs = loadProfile(profile)
  sample ??= lhrs[0]
  const rows = summarize(lhrs).map(
    (r) =>
      `| \`${r.page}\` | ${r.runs} | ${CATEGORIES.map(([id]) => score(r[id], GOALS[id])).join(' | ')} | ${ms(r.lcp)} | ${decimal(r.cls, 3)} | ${ms(r.tbt)} |`,
  )
  sections.push(
    `### ${profile === 'mobile' ? 'Mobile' : 'Desktop'}`,
    '',
    `Condições: ${conditions(lhrs[0])}.`,
    '',
    `| Página | Execuções | ${CATEGORIES.map(([, label]) => label).join(' | ')} | LCP | CLS | TBT |`,
    `| --- | --: | ${CATEGORIES.map(() => '--:').join(' | ')} | --: | --: | --: |`,
    ...rows,
    '',
  )
}

const chrome = sample.environment.hostUserAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? 'desconhecido'
const cpus = os.cpus()
const generated = [
  START,
  `Gerado por \`scripts/lh-summary.mjs\` em ${new Date(sample.fetchTime).toISOString().slice(0, 10)}. Valores são a mediana das execuções; ⚠ marca o que ficou abaixo da meta (Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 90).`,
  '',
  `- Lighthouse ${sample.lighthouseVersion}, Chrome ${chrome}, Node ${process.version.slice(1)}`,
  `- ${os.type()} ${os.release()} (${os.arch()}), ${cpus[0]?.model.trim() ?? 'CPU desconhecida'} × ${cpus.length}, benchmarkIndex ${Math.round(sample.environment.benchmarkIndex)}`,
  '- Build de produção servido por `vite preview`, com os mocks (MSW + socket simulado) ativos, como no deploy.',
  '',
  ...sections,
  END,
].join('\n')

const current = existsSync(SUMMARY)
  ? readFileSync(SUMMARY, 'utf8')
  : `# Auditoria Lighthouse\n\nRodar com \`pnpm lighthouse\` (ou \`LH_PORT=<porta> pnpm lighthouse\` se a 4174 estiver ocupada). Relatórios completos em \`lighthouse/reports/<perfil>\`.\n\n${START}\n${END}\n\n## Abaixo da meta\n\nNada abaixo da meta.\n`
const [before, rest] = current.split(START)
const after = rest?.split(END)[1] ?? '\n'
writeFileSync(SUMMARY, `${before}${generated}${after}`)
console.log(`${SUMMARY} atualizado.`)
