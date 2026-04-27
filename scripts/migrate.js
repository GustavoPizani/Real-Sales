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

// Se a migration de remoção do PRE_SALES falhou anteriormente, resolve o estado de erro
// para que o deploy possa re-aplicar com o SQL corrigido.
try {
  run('prisma migrate resolve --rolled-back 20260427000000_remove_pre_sales_add_slack')
  console.log('[migrate] Rolled back failed migration, will re-apply.')
} catch {
  console.log('[migrate] No failed migration to roll back, continuing.')
}

// Apply any pending migrations.
run('prisma migrate deploy')
console.log('[migrate] Deploy complete.')
