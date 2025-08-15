-- Atualizar usuário administrador para o Gustavo Pizani
-- Senha padrão: RealSales2024! (hash bcrypt)
INSERT INTO users (name, email, password_hash, role) 
VALUES (
    'Gustavo Pizani', 
    'pizani@realsales.com.br', 
    '$2a$12$8K1p/a0dclxKONwGJ6V7Oe7FXdKXXhUxvpbVabzWpS4pMQGRg5jqW', 
    'admin'
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

-- Atualizar propriedades existentes com novos campos
UPDATE properties SET 
    typologies = '[
        {"id": "1", "name": "2 Quartos", "value": 350000, "description": "Apartamento de 2 quartos"},
        {"id": "2", "name": "3 Quartos", "value": 480000, "description": "Apartamento de 3 quartos"}
    ]'::jsonb,
    developer_name = 'Construtora Exemplo',
    partnership_manager = 'João Silva',
    images = '[]'::jsonb
WHERE typologies IS NULL OR typologies = '[]'::jsonb;

-- Inserir algumas alterações de exemplo para demonstração
INSERT INTO property_changes (property_id, user_id, field, old_value, new_value, status)
SELECT 
    p.id,
    u.id,
    'title',
    '"Título Antigo"'::jsonb,
    '"Título Novo"'::jsonb,
    'pending'
FROM properties p, users u 
WHERE u.email = 'pizani@realsales.com.br'
LIMIT 1;
