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

// The mailing-lists migration was run by hand directly on Supabase (not via
// `prisma migrate deploy`), so Prisma's migration history has no record of it.
// Mark it resolved too, or `migrate deploy` will try to re-run its CREATE TABLE
// statements and fail with "relation already exists".
try {
  run('prisma migrate resolve --applied 20260810120000_add_mailing_lists')
  console.log('[migrate] Mailing lists baseline applied.')
} catch {
  console.log('[migrate] Mailing lists baseline already resolved, continuing.')
}

// Same deal — classification fields (snoozedUntil/discardReason/notes) were also
// run by hand directly on Supabase.
try {
  run('prisma migrate resolve --applied 20260810130000_add_classification_fields')
  console.log('[migrate] Classification fields baseline applied.')
} catch {
  console.log('[migrate] Classification fields baseline already resolved, continuing.')
}

// active_offers/active_offer_clients were originally created (by hand) without
// createdAt/updatedAt/status/notes/contactedAt — applied directly to fix it.
try {
  run('prisma migrate resolve --applied 20260810140000_add_active_offer_timestamps_and_status')
  console.log('[migrate] Active offer timestamps baseline applied.')
} catch {
  console.log('[migrate] Active offer timestamps baseline already resolved, continuing.')
}

// Oferta Ativa + Mailing foram unificados num modelo só — rodado à mão no Supabase.
try {
  run('prisma migrate resolve --applied 20260810150000_unify_active_offer_and_mailing')
  console.log('[migrate] Unify active offer/mailing baseline applied.')
} catch {
  console.log('[migrate] Unify active offer/mailing baseline already resolved, continuing.')
}

// Imóvel padrão da campanha — rodado à mão no Supabase.
try {
  run('prisma migrate resolve --applied 20260811100000_add_offer_default_property')
  console.log('[migrate] Offer default property baseline applied.')
} catch {
  console.log('[migrate] Offer default property baseline already resolved, continuing.')
}

// Capa do imóvel — rodado à mão no Supabase.
try {
  run('prisma migrate resolve --applied 20260811110000_add_property_image_cover')
  console.log('[migrate] Property image cover baseline applied.')
} catch {
  console.log('[migrate] Property image cover baseline already resolved, continuing.')
}

// Apply any pending migrations.
run('prisma migrate deploy')
console.log('[migrate] Deploy complete.')
