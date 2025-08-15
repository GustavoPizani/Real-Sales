-- Inserir usuário administrador padrão
-- Senha: admin123 (hash bcrypt)
INSERT INTO users (name, email, password_hash, role) 
VALUES (
    'Administrador', 
    'admin@realsales.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Inserir usuário corretor
INSERT INTO users (name, email, password_hash, role) 
VALUES (
    'João Corretor', 
    'joao@realsales.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 
    'user'
) ON CONFLICT (email) DO NOTHING;

-- Inserir alguns clientes de exemplo
INSERT INTO clients (name, email, phone, status) VALUES
    ('João Silva', 'joao.silva@email.com', '(11) 99999-1111', 'active'),
    ('Maria Santos', 'maria.santos@email.com', '(11) 99999-2222', 'active'),
    ('Pedro Oliveira', 'pedro.oliveira@email.com', '(11) 99999-3333', 'inactive'),
    ('Ana Costa', 'ana.costa@email.com', '(11) 99999-4444', 'active'),
    ('Carlos Ferreira', 'carlos.ferreira@email.com', '(11) 99999-5555', 'active')
ON CONFLICT (email) DO NOTHING;

-- Inserir algumas propriedades de exemplo
INSERT INTO properties (title, description, price, type, status, address, bedrooms, bathrooms, area) VALUES
    ('Apartamento Moderno Centro', 'Lindo apartamento no centro da cidade com 2 quartos', 350000.00, 'apartamento', 'available', 'Rua das Flores, 123 - Centro, São Paulo', 2, 1, 65.5),
    ('Casa Espaçosa Jardins', 'Casa térrea com quintal amplo nos Jardins', 480000.00, 'casa', 'available', 'Av. Principal, 456 - Jardins, São Paulo', 3, 2, 120.0),
    ('Cobertura Luxo Moema', 'Cobertura duplex com vista panorâmica', 950000.00, 'cobertura', 'sold', 'Rua Nobre, 789 - Moema, São Paulo', 4, 3, 180.0),
    ('Apartamento Compacto Vila Madalena', 'Apartamento studio moderno e funcional', 280000.00, 'apartamento', 'available', 'Rua Harmonia, 321 - Vila Madalena, São Paulo', 1, 1, 35.0),
    ('Casa Familiar Perdizes', 'Casa de 3 quartos ideal para família', 650000.00, 'casa', 'available', 'Rua Monte Alegre, 654 - Perdizes, São Paulo', 3, 2, 140.0)
ON CONFLICT DO NOTHING;

-- Inserir algumas tarefas de exemplo (usando subquery para pegar IDs dos usuários e clientes)
INSERT INTO tasks (title, description, status, priority, due_date, client_id, assigned_to, created_by)
SELECT 
    'Ligar para ' || c.name,
    'Fazer contato inicial com o cliente ' || c.name,
    'pending',
    'high',
    CURRENT_TIMESTAMP + INTERVAL '1 day',
    c.id,
    u.id,
    u.id
FROM clients c, users u 
WHERE c.email = 'joao.silva@email.com' AND u.email = 'admin@realsales.com'
LIMIT 1;

INSERT INTO tasks (title, description, status, priority, due_date, client_id, assigned_to, created_by)
SELECT 
    'Enviar proposta para ' || c.name,
    'Preparar e enviar proposta comercial personalizada',
    'in_progress',
    'medium',
    CURRENT_TIMESTAMP + INTERVAL '3 days',
    c.id,
    u.id,
    u.id
FROM clients c, users u 
WHERE c.email = 'maria.santos@email.com' AND u.email = 'admin@realsales.com'
LIMIT 1;

INSERT INTO tasks (title, description, status, priority, due_date, client_id, assigned_to, created_by)
SELECT 
    'Agendar visita com ' || c.name,
    'Agendar visita aos imóveis selecionados',
    'pending',
    'high',
    CURRENT_TIMESTAMP + INTERVAL '2 days',
    c.id,
    u.id,
    u.id
FROM clients c, users u 
WHERE c.email = 'ana.costa@email.com' AND u.email = 'admin@realsales.com'
LIMIT 1;

-- Inserir algumas notas de exemplo
INSERT INTO client_notes (client_id, user_id, note)
SELECT 
    c.id,
    u.id,
    'Cliente muito interessado em apartamentos na região central. Orçamento até R$ 400.000.'
FROM clients c, users u 
WHERE c.email = 'joao.silva@email.com' AND u.email = 'admin@realsales.com'
LIMIT 1;

INSERT INTO client_notes (client_id, user_id, note)
SELECT 
    c.id,
    u.id,
    'Procura casa com quintal para os filhos. Preferência por bairros familiares.'
FROM clients c, users u 
WHERE c.email = 'maria.santos@email.com' AND u.email = 'admin@realsales.com'
LIMIT 1;

INSERT INTO client_notes (client_id, user_id, note)
SELECT 
    c.id,
    u.id,
    'Investidora experiente. Interessada em imóveis para locação.'
FROM clients c, users u 
WHERE c.email = 'ana.costa@email.com' AND u.email = 'admin@realsales.com'
LIMIT 1;
