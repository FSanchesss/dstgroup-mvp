/**
 * Cria o bucket cadwork-viewers no Supabase Storage.
 * Rode uma vez: node scripts/create-bucket.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const { data, error } = await supabase.storage.createBucket('cadwork-viewers', {
  public: true,
  fileSizeLimit: 50 * 1024 * 1024, // 50 MB
})

if (error) {
  if (error.message?.includes('already exists')) {
    console.log('✓ Bucket cadwork-viewers já existe.')
  } else {
    console.error('❌  Erro ao criar bucket:', error.message)
  }
} else {
  console.log('✓ Bucket cadwork-viewers criado com sucesso!')
}
