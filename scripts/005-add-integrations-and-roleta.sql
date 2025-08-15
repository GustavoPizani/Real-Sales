-- Criar tabela para configurações de integração
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_site_url TEXT,
  facebook_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela para mapeamento de campos
CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name VARCHAR(100) NOT NULL, -- nome do campo no CRM (ex: full_name)
  mapped_field VARCHAR(100) NOT NULL, -- nome do campo que vem do webhook (ex: nome_completo)
  source VARCHAR(50) NOT NULL, -- 'site' ou 'facebook'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela para roletas
CREATE TABLE IF NOT EXISTS roletas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  ativa BOOLEAN DEFAULT true,
  last_assigned_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de relacionamento entre roletas e usuários
CREATE TABLE IF NOT EXISTS roleta_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roleta_id UUID NOT NULL REFERENCES roletas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(roleta_id, user_id)
);

-- Inserir configuração inicial de integração
INSERT INTO integrations (webhook_site_url, facebook_api_key) 
VALUES ('', '') 
ON CONFLICT DO NOTHING;

-- Inserir mapeamentos padrão para site
INSERT INTO field_mappings (field_name, mapped_field, source) VALUES
('full_name', 'nome', 'site'),
('email', 'email', 'site'),
('phone', 'telefone', 'site'),
('notes', 'mensagem', 'site')
ON CONFLICT DO NOTHING;

-- Inserir mapeamentos padrão para Facebook
INSERT INTO field_mappings (field_name, mapped_field, source) VALUES
('full_name', 'full_name', 'facebook'),
('email', 'email', 'facebook'),
('phone', 'phone_number', 'facebook')
ON CONFLICT DO NOTHING;
