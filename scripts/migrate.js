// Runs before `next build` on Vercel.
// Baselines the first migration (existing schema) then deploys new ones.
const { execSync } = require('child_process')

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' })
}

// Mark the initial migration as already applied (baseline).
// Safe to call multiple times — ignored if already resolved.
try {
  run('prisma migrate resolve --applied 20260112205212_add_field_mapping_model')
  console.log('[migrate] Baseline applied.')
} catch {
  console.log('[migrate] Baseline already resolved, continuing.')
}

// Apply any pending migrations (e.g. the new multi-device push subscription one).
run('prisma migrate deploy')
console.log('[migrate] Deploy complete.')
