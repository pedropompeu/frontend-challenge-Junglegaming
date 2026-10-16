// Lighthouse CI, perfil desktop (preset `desktop`: 1350×940, throttling de cabo, sem lentidão de CPU).
// `LH_PORT` troca a porta do preview quando a 4174 já está em uso na máquina.
const port = process.env.LH_PORT ?? '4174'

module.exports = {
  ci: {
    collect: {
      startServerCommand: `pnpm preview --port ${port} --strictPort`,
      startServerReadyPattern: 'Local',
      url: [`http://localhost:${port}/`, `http://localhost:${port}/nft/nft_neon-vessel`],
      numberOfRuns: 3,
      settings: { preset: 'desktop' },
    },
    upload: { target: 'filesystem', outputDir: 'lighthouse/reports/desktop' },
  },
}
