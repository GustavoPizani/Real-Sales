-- Insert admin user
INSERT INTO users (id, name, email, password, role, active, created_at, updated_at) 
VALUES (
    'user_admin_001',
    'Gustavo Pizani',
    'pizani@realsales.com.br',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- RealSales2024!
    'admin',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING;

-- Insert sample properties
INSERT INTO properties (id, name, type, status, price, location, description, features, images, created_at, updated_at) VALUES
('prop_001', 'Residencial Vista Verde', 'apartment', 'available', 450000.00, 'Bairro Jardim das Flores, São Paulo - SP', 'Apartamento moderno com 3 quartos, 2 banheiros e varanda gourmet. Localizado em condomínio com área de lazer completa.', ARRAY['3 quartos', '2 banheiros', 'Varanda gourmet', 'Piscina', 'Academia', 'Playground'], ARRAY['/placeholder.jpg'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prop_002', 'Casa Moderna Alphaville', 'house', 'available', 850000.00, 'Alphaville, Barueri - SP', 'Casa térrea com 4 suítes, piscina e churrasqueira. Condomínio fechado com segurança 24h.', ARRAY['4 suítes', 'Piscina', 'Churrasqueira', 'Garagem para 4 carros', 'Jardim', 'Segurança 24h'], ARRAY['/placeholder.jpg'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prop_003', 'Loft Centro Histórico', 'apartment', 'sold', 320000.00, 'Centro Histórico, São Paulo - SP', 'Loft reformado no centro histórico, próximo ao metrô e principais atrações da cidade.', ARRAY['1 quarto', '1 banheiro', 'Cozinha americana', 'Próximo ao metrô', 'Centro histórico'], ARRAY['/placeholder.jpg'], CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample clients
INSERT INTO clients (id, name, email, phone, status, source, assigned_to, notes, created_at, updated_at) VALUES
('client_001', 'Maria Silva Santos', 'maria.silva@email.com', '(11) 99999-1234', 'prospect', 'website', 'user_admin_001', 'Interessada em apartamento de 3 quartos na zona sul', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('client_002', 'João Pedro Oliveira', 'joao.pedro@email.com', '(11) 98888-5678', 'client', 'referral', 'user_admin_001', 'Cliente fechou compra do apartamento Vista Verde', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('client_003', 'Ana Carolina Lima', 'ana.lima@email.com', '(11) 97777-9012', 'lead', 'facebook_ads', 'user_admin_001', 'Lead gerado via Facebook Ads - campanha apartamentos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample leads
INSERT INTO leads (id, name, email, phone, source, status, interest, budget, assigned_to, created_at, updated_at) VALUES
('lead_001', 'Carlos Eduardo Santos', 'carlos.santos@email.com', '(11) 96666-3456', 'google_ads', 'new', 'Apartamento 2 quartos', 400000.00, 'user_admin_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('lead_002', 'Fernanda Costa', 'fernanda.costa@email.com', '(11) 95555-7890', 'website', 'contacted', 'Casa com piscina', 600000.00, 'user_admin_001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert sample tasks
INSERT INTO tasks (id, title, description, status, priority, assigned_to, client_id, due_date, created_at, updated_at) VALUES
('task_001', 'Ligar para Maria Silva', 'Retornar ligação sobre apartamento de 3 quartos', 'pending', 'high', 'user_admin_001', 'client_001', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('task_002', 'Agendar visita - João Pedro', 'Agendar visita ao apartamento Vista Verde', 'completed', 'medium', 'user_admin_001', 'client_002', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('task_003', 'Follow-up Ana Carolina', 'Fazer follow-up do lead gerado via Facebook', 'in_progress', 'medium', 'user_admin_001', 'client_003', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
