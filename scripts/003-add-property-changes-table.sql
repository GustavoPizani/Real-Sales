-- Tabela para controle de alterações em propriedades
CREATE TABLE IF NOT EXISTS property_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    field VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar campos para empreendimentos completos
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS typologies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS developer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS partnership_manager VARCHAR(255),
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_property_changes_property_id ON property_changes(property_id);
CREATE INDEX IF NOT EXISTS idx_property_changes_status ON property_changes(status);
CREATE INDEX IF NOT EXISTS idx_property_changes_user_id ON property_changes(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_property_changes_updated_at 
BEFORE UPDATE ON property_changes 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
