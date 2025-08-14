-- Inserir usuário administrador padrão
-- Senha: admin123 (hash bcrypt)
INSERT INTO users (name, email, password, role, active) 
VALUES (
    'Admin', 
    'admin@realsales.com', 
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', 
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Inserir alguns clientes de exemplo
INSERT INTO clients (name, email, phone, status) VALUES
    ('João Silva', 'joao@email.com', '(11) 99999-1111', 'active'),
    ('Maria Santos', 'maria@email.com', '(11) 99999-2222', 'active'),
    ('Pedro Oliveira', 'pedro@email.com', '(11) 99999-3333', 'active'),
    ('Ana Costa', 'ana@email.com', '(11) 99999-4444', 'active')
ON CONFLICT (email) DO NOTHING;

-- Inserir algumas propriedades de exemplo
INSERT INTO properties (title, description, price, address, bedrooms, bathrooms, area, status) VALUES
    ('Apartamento 2 Quartos - Vila Madalena', 'Lindo apartamento com 2 quartos, sala ampla e cozinha moderna', 450000.00, 'Rua Harmonia, 123 - Vila Madalena, São Paulo', 2, 1, 65.00, 'available'),
    ('Casa 3 Quartos - Jardins', 'Casa espaçosa com jardim e garagem para 2 carros', 850000.00, 'Rua Augusta, 456 - Jardins, São Paulo', 3, 2, 120.00, 'available'),
    ('Studio - Pinheiros', 'Studio moderno e bem localizado', 280000.00, 'Rua dos Pinheiros, 789 - Pinheiros, São Paulo', 1, 1, 35.00, 'available'),
    ('Cobertura - Moema', 'Cobertura duplex com vista panorâmica', 1200000.00, 'Av. Ibirapuera, 321 - Moema, São Paulo', 4, 3, 180.00, 'sold')
ON CONFLICT DO NOTHING;

-- Inserir algumas tarefas de exemplo
INSERT INTO tasks (title, description, status, priority, due_date, client_id, user_id) VALUES 
('Ligar para João Silva', 'Agendar visita ao apartamento na Vila Madalena', 'pending', 'high', '2024-01-20 10:00:00', 1, 1),
('Preparar contrato', 'Elaborar contrato de compra e venda para Maria Santos', 'in_progress', 'medium', '2024-01-22 14:00:00', 2, 1),
('Visita técnica', 'Acompanhar vistoria do imóvel com Pedro Oliveira', 'pending', 'medium', '2024-01-25 09:00:00', 3, 1),
('Follow-up Ana Costa', 'Verificar interesse em outros imóveis', 'completed', 'low', '2024-01-18 16:00:00', 4, 1);

-- Inserir algumas notas de exemplo
INSERT INTO client_notes (client_id, user_id, note) VALUES 
(1, 1, 'Cliente muito interessado no apartamento da Vila Madalena. Tem condições de pagamento à vista.'),
(2, 1, 'Maria precisa de financiamento. Já tem pré-aprovação do banco.'),
(3, 1, 'Pedro está procurando casa com jardim para os filhos. Orçamento até R$ 900.000.'),
(4, 1, 'Ana vendeu o apartamento atual e precisa de algo maior. Prazo até março.');
