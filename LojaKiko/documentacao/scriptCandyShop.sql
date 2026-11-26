-- BANCO DE DADOS LOJA KIKO - CATÁLOGO DE MAQUIAGENS
-- Corrigido: remove produtos alimentícios e cadastra maquiagens, coleções e tons.
-- ATENÇÃO: este script APAGA e recria as tabelas no início. Faça backup antes de executar.
-- Mantém os IDs de produto_tom 1 a 12 usados pelos pedidos de exemplo.

-- ============================================================
-- Limpar e recriar o banco de dados (ajustado ao diagrama)
-- ============================================================
DROP TABLE IF EXISTS public.pagamento_has_forma_pagamento CASCADE;
DROP TABLE IF EXISTS public.pedido_has_produto CASCADE;
DROP TABLE IF EXISTS public.pagamento CASCADE;
DROP TABLE IF EXISTS public.pedido CASCADE;
DROP TABLE IF EXISTS public.produto_tom CASCADE;
DROP TABLE IF EXISTS public.tom CASCADE;
DROP TABLE IF EXISTS public.produto CASCADE;
DROP TABLE IF EXISTS public.colecao CASCADE;
DROP TABLE IF EXISTS public.forma_pagamento CASCADE;
DROP TABLE IF EXISTS public.funcionario CASCADE;
DROP TABLE IF EXISTS public.cliente CASCADE;
DROP TABLE IF EXISTS public.cargo CASCADE;
DROP TABLE IF EXISTS public.pessoa CASCADE;

DROP SEQUENCE IF EXISTS public.cargo_id_cargo_seq;
DROP SEQUENCE IF EXISTS public.forma_pagamento_id_forma_pagamento_seq;
DROP SEQUENCE IF EXISTS public.pedido_id_pedido_seq;
DROP SEQUENCE IF EXISTS public.produto_id_produto_seq;
DROP SEQUENCE IF EXISTS public.produto_tom_id_produto_tom_seq;
DROP SEQUENCE IF EXISTS public.colecao_id_colecao_seq;
DROP SEQUENCE IF EXISTS public.tom_id_tom_seq;
DROP SEQUENCE IF EXISTS public.pagamento_id_pagamento_seq;

-- ============================================================
-- Tabelas
-- ============================================================

-- Pessoa
CREATE TABLE public.pessoa (
    cpf_pessoa character varying(20) NOT NULL PRIMARY KEY,
    nome_pessoa character varying(60),
    data_nascimento_pessoa date,
    endereco_pessoa character varying(150),
    senha_pessoa character varying(50),
    email_pessoa character varying(75) UNIQUE,
    usuario_pessoa character varying(50),
    telefone_pessoa character varying(20)
);

-- Cargo (1) --- (N) Funcionario
CREATE SEQUENCE public.cargo_id_cargo_seq;
CREATE TABLE public.cargo (
    id_cargo integer PRIMARY KEY DEFAULT nextval('public.cargo_id_cargo_seq'),
    nome_cargo character varying(45)
);

-- Funcionario (especialização de Pessoa)
CREATE TABLE public.funcionario (
    pessoa_cpf_pessoa character varying(20) NOT NULL PRIMARY KEY,
    salario_funcionario double precision,
    cargo_id_cargo integer,
    FOREIGN KEY (pessoa_cpf_pessoa) REFERENCES public.pessoa(cpf_pessoa),
    FOREIGN KEY (cargo_id_cargo) REFERENCES public.cargo(id_cargo)
);

-- Cliente (especialização de Pessoa)
CREATE TABLE public.cliente (
    pessoa_cpf_pessoa character varying(20) NOT NULL PRIMARY KEY,
    data_cadastro_cliente date,
    FOREIGN KEY (pessoa_cpf_pessoa) REFERENCES public.pessoa(cpf_pessoa)
);

-- Coleção (1) --- (N) Produto
CREATE SEQUENCE public.colecao_id_colecao_seq;
CREATE TABLE public.colecao (
    id_colecao integer PRIMARY KEY DEFAULT nextval('public.colecao_id_colecao_seq'),
    nome_colecao character varying(60) NOT NULL
);

-- Produto
CREATE SEQUENCE public.produto_id_produto_seq;
CREATE TABLE public.produto (
    id_produto integer PRIMARY KEY DEFAULT nextval('public.produto_id_produto_seq'),
    nome_produto character varying(45),
    quantidade_estoque_produto integer,
    preco_unitario_produto double precision,
    colecao_id_colecao integer,
    FOREIGN KEY (colecao_id_colecao) REFERENCES public.colecao(id_colecao)
);

-- Tom
CREATE SEQUENCE public.tom_id_tom_seq;
CREATE TABLE public.tom (
    id_tom integer PRIMARY KEY DEFAULT nextval('public.tom_id_tom_seq'),
    nome_tom character varying(40) NOT NULL UNIQUE
);

-- Produto (N) --- (N) Tom
CREATE SEQUENCE public.produto_tom_id_produto_tom_seq;
CREATE TABLE public.produto_tom (
    id_produto_tom integer PRIMARY KEY DEFAULT nextval('public.produto_tom_id_produto_tom_seq'),
    produto_id_produto integer NOT NULL,
    tom_id_tom integer NOT NULL,
    quantidade_estoque_tom integer DEFAULT 0 CHECK (quantidade_estoque_tom >= 0),
    UNIQUE (produto_id_produto, tom_id_tom),
    FOREIGN KEY (produto_id_produto) REFERENCES public.produto(id_produto),
    FOREIGN KEY (tom_id_tom) REFERENCES public.tom(id_tom)
);

-- Pedido (Funcionario 1:N Pedido, Cliente 1:N Pedido)
CREATE SEQUENCE public.pedido_id_pedido_seq;
CREATE TABLE public.pedido (
    id_pedido integer PRIMARY KEY DEFAULT nextval('public.pedido_id_pedido_seq'),
    data_pedido date,
    cliente_pessoa_cpf_pessoa character varying(20),
    funcionario_pessoa_cpf_pessoa character varying(20),
    FOREIGN KEY (cliente_pessoa_cpf_pessoa) REFERENCES public.cliente(pessoa_cpf_pessoa),
    FOREIGN KEY (funcionario_pessoa_cpf_pessoa) REFERENCES public.funcionario(pessoa_cpf_pessoa)
);

-- Pedido (N) --- (N) Produto_Tom
CREATE TABLE public.pedido_has_produto (
    pedido_id_pedido integer NOT NULL,
    produto_tom_id_produto_tom integer NOT NULL,
    quantidade integer,
    preco_unitario double precision,
    PRIMARY KEY (pedido_id_pedido, produto_tom_id_produto_tom),
    FOREIGN KEY (pedido_id_pedido) REFERENCES public.pedido(id_pedido),
    FOREIGN KEY (produto_tom_id_produto_tom) REFERENCES public.produto_tom(id_produto_tom)
);

-- Forma de pagamento
CREATE SEQUENCE public.forma_pagamento_id_forma_pagamento_seq;
CREATE TABLE public.forma_pagamento (
    id_forma_pagamento integer PRIMARY KEY DEFAULT nextval('public.forma_pagamento_id_forma_pagamento_seq'),
    nome_forma_pagamento character varying(100)
);

-- Pedido (1) --- (N) Pagamento
CREATE SEQUENCE public.pagamento_id_pagamento_seq;
CREATE TABLE public.pagamento (
    id_pagamento integer PRIMARY KEY DEFAULT nextval('public.pagamento_id_pagamento_seq'),
    pedido_id_pedido integer NOT NULL,
    data_pagamento timestamp without time zone,
    valor_total_pagamento double precision,
    FOREIGN KEY (pedido_id_pedido) REFERENCES public.pedido(id_pedido)
);

-- Pagamento (N) --- (N) Forma_Pagamento
CREATE TABLE public.pagamento_has_forma_pagamento (
    pagamento_id_pagamento integer NOT NULL,
    forma_pagamento_id_forma_pagamento integer NOT NULL,
    valor_pago double precision,
    PRIMARY KEY (pagamento_id_pagamento, forma_pagamento_id_forma_pagamento),
    FOREIGN KEY (pagamento_id_pagamento) REFERENCES public.pagamento(id_pagamento),
    FOREIGN KEY (forma_pagamento_id_forma_pagamento) REFERENCES public.forma_pagamento(id_forma_pagamento)
);

-- ============================================================
-- Dados
-- ============================================================

INSERT INTO public.cargo (id_cargo, nome_cargo) VALUES
(0, 'Vendedor online'),
(1, 'Vendedor'),
(2, 'Gerente'),
(3, 'Caixa'),
(4, 'Supervisor'),
(5, 'Atendente'),
(6, 'Repositor'),
(7, 'Conferente'),
(8, 'Assistente'),
(9, 'Auxiliar'),
(10, 'Diretor');

INSERT INTO public.pessoa (cpf_pessoa, nome_pessoa, data_nascimento_pessoa, endereco_pessoa, senha_pessoa, email_pessoa) VALUES
('14', 'Lara', '2010-03-26', 'minha casa', '2603', 'laraszanoni14@gmail.com'),
('00000000000', 'online', '1900-01-01', 'Loja', 'abc123', 'online@gmail.com'),
('1', 'Berola', '2025-10-16', 'Lá onde Judas perdeu a unha, s/n', '12345', 'berola@gmail.com'),
('2', 'dois', '2025-10-07', 'Rua das Magnólias', '123', 'dois@email.com'),
('10101010101', 'Juliana Dias ssss', '1989-10-25', 'lins, 352 ssss', '1111', 'juliana@email.comm'),
('11111111111', 'João Silva', '2025-01-01', 'algum lugar', '.123456', 'joao@email.com'),
('22222222222', 'Maria Souza', '1985-02-15', 'lá longe, 1234', '.123456', 'maria@email.com'),
('33333333333', 'Carlos Pereira', '1992-03-20', 'Rua que Judas perdeu as botas, 234', '.123456', 'carlos@email.com'),
('44444444444', 'Ana Lima', '1995-04-25', 'Alameda do medo, 4534 apto 13', '.123456', 'ana@email.com'),
('55555555555', 'Lucas Mendes', '1988-05-30', 'Rua sexta_feira, 13 _ apto 666', '.123456', 'lucas@email.com'),
('66666666666', 'Fernanda Costa', '1993-06-05', 'muito longe, 243', '.123456', 'fernanda@email.com'),
('77777777777', 'Ricardo Alves', '1987-07-10', 'far far faraway, 34', '.123456', 'ricardo@email.com'),
('88888888888', 'Patrícia Gomes', '1994-08-15', 'acolá, 54', '.123456', 'patricia@email.com'),
('99999999999', 'Marcos Rocha', '1991-09-20', 'kaxa prego _ ilha de itaparica', '.123456', 'marcos@email.com');

INSERT INTO public.funcionario (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo) VALUES
('14', 10000, 2);

INSERT INTO public.cliente (pessoa_cpf_pessoa, data_cadastro_cliente) VALUES
('00000000000', NULL),
('1', '2025-10-11'),
('2', '2025-10-15'),
('10101010101', '2024-01-10'),
('11111111111', NULL),
('22222222222', '2024-01-02'),
('33333333333', '2024-01-03'),
('44444444444', '2024-01-04'),
('55555555555', '2024-01-05'),
('66666666666', '2024-01-06'),
('77777777777', '2024-01-07'),
('88888888888', '2024-01-08'),
('99999999999', '2024-01-09');

INSERT INTO public.colecao (id_colecao, nome_colecao) VALUES
(1, 'Preparação de Pele'),
(2, 'Lábios'),
(3, 'Olhos'),
(4, 'Maquiagem e Acessórios'),
(5, 'Face e Acabamento');

INSERT INTO public.produto (id_produto, nome_produto, quantidade_estoque_produto, preco_unitario_produto, colecao_id_colecao) VALUES
(1, 'Base Líquida Matte', 100, 55.00, 1),
(2, 'Corretivo Líquido', 200, 43.00, 1),
(3, 'Pó Compacto', 150, 39.90, 5),
(4, 'Blush Compacto', 80, 32.00, 5),
(5, 'Batom Matte', 50, 29.90, 2),
(6, 'Gloss Labial', 60, 34.90, 2),
(7, 'Máscara de Cílios', 300, 45.00, 3),
(8, 'Delineador Líquido', 40, 27.90, 3),
(9, 'Paleta de Sombras', 30, 85.00, 3),
(10, 'Iluminador Compacto', 20, 42.00, 5);

INSERT INTO public.tom (id_tom, nome_tom) VALUES
(1, 'Porcelana'),
(2, 'Bege Claro'),
(3, 'Bege Médio'),
(4, 'Bege Escuro'),
(5, 'Marrom'),
(6, 'Nude'),
(7, 'Rosa Claro'),
(8, 'Rosa'),
(9, 'Vermelho'),
(10, 'Vinho'),
(11, 'Dourado'),
(12, 'Rosé'),
(13, 'Translúcido'),
(14, 'Preto'),
(15, 'Colorido');

-- Cada produto recebe os tons/variações que fazem sentido para sua categoria.
-- Os IDs 1 a 12 são mantidos para preservar os itens já usados nos pedidos de exemplo.
INSERT INTO public.produto_tom (id_produto_tom, produto_id_produto, tom_id_tom, quantidade_estoque_tom) VALUES
(1, 1, 1, 30),
(2, 1, 2, 40),
(3, 2, 1, 50),
(4, 3, 13, 100),
(5, 3, 3, 50),
(6, 4, 8, 40),
(7, 5, 9, 25),
(8, 6, 6, 30),
(9, 7, 14, 150),
(10, 8, 14, 20),
(11, 9, 15, 15),
(12, 10, 11, 10),
(13, 1, 3, 20),
(14, 1, 4, 10),
(15, 1, 5, 10),
(16, 2, 2, 50),
(17, 2, 3, 50),
(18, 2, 4, 50),
(19, 2, 5, 50),
(20, 3, 1, 25),
(21, 3, 2, 25),
(22, 4, 7, 20),
(23, 4, 9, 20),
(24, 4, 12, 20),
(25, 5, 6, 15),
(26, 5, 8, 15),
(27, 5, 10, 10),
(28, 6, 7, 15),
(29, 6, 9, 15),
(30, 6, 12, 15),
(31, 9, 11, 10),
(32, 9, 12, 10),
(33, 10, 12, 10);

INSERT INTO public.pedido (id_pedido, data_pedido, cliente_pessoa_cpf_pessoa, funcionario_pessoa_cpf_pessoa) VALUES
(1, '2024-02-01', '44444444444', '14'),
(2, '2024-02-02', '11111111111', '14'),
(3, '2024-02-03', '55555555555', '14'),
(4, '2024-02-04', '99999999999', '14'),
(5, '2024-02-05', '33333333333', '14'),
(7, '2024-02-07', '44444444444', '14'),
(8, '2024-02-08', '66666666666', '14'),
(9, '2024-02-09', '88888888888', '14'),
(10, '2024-02-10', '10101010101', '14'),
(11, '2025-11-12', '11111111111', '14'),
(12, '2025-11-12', '1', '14'),
(13, '2025-11-13', '1', '14'),
(14, '2025-11-13', '1', '14'),
(15, '2025-11-13', '1', '14'),
(16, '2025-11-13', '1', '14'),
(17, '2025-11-13', '1', '14'),
(18, '2025-11-13', '1', '14'),
(19, '2025-11-13', '1', '14'),
(20, '2025-10-10', '33333333333', '14');

-- Preço unitário = preço do produto; totais batem com os pagamentos abaixo
INSERT INTO public.pedido_has_produto (pedido_id_pedido, produto_tom_id_produto_tom, quantidade, preco_unitario) VALUES
(1, 1, 2, 55),   -- 110
(1, 3, 1, 43),   --  43
(1, 4, 3, 10),   --  30  => total 183
(2, 3, 10, 43),  -- 430
(2, 4, 5, 10),   --  50
(2, 6, 3, 32),   --  96  => total 576
(3, 3, 1, 43),   --  43
(4, 6, 4, 32),   -- 128
(5, 7, 2, 70),   -- 140
(7, 9, 2, 75),   -- 150
(8, 10, 1, 60),  --  60
(9, 11, 1, 85),  --  85
(10, 8, 2, 45),  --  90
(20, 3, 1, 43);  --  43

INSERT INTO public.forma_pagamento (id_forma_pagamento, nome_forma_pagamento) VALUES
(1, 'Dinheiro'),
(2, 'Cartão de Crédito'),
(3, 'Cartão de Débito'),
(4, 'Pix'),
(5, 'Boleto'),
(6, 'Vale Alimentação'),
(7, 'Transferência Bancária'),
(8, 'Cheque'),
(9, 'Crédito Loja'),
(10, 'Gift Card');

-- Pedido 1 foi pago em dois pagamentos (exemplo da relação 1:N)
INSERT INTO public.pagamento (id_pagamento, pedido_id_pedido, data_pagamento, valor_total_pagamento) VALUES
(1, 1, '2024-02-01 10:00:00', 100),
(2, 1, '2024-02-01 10:05:00', 83),
(3, 2, '2024-02-02 11:00:00', 576),
(4, 3, '2024-02-03 12:00:00', 43),
(5, 4, '2024-02-04 13:00:00', 128),
(6, 5, '2024-02-05 14:00:00', 140),
(7, 7, '2024-02-07 16:00:00', 150),
(8, 8, '2024-02-08 17:00:00', 60),
(9, 9, '2024-02-09 18:00:00', 85),
(10, 10, '2024-02-10 19:00:00', 90),
(11, 20, '2025-10-10 09:00:00', 43);

-- A soma de valor_pago de cada pagamento = valor_total_pagamento
INSERT INTO public.pagamento_has_forma_pagamento (pagamento_id_pagamento, forma_pagamento_id_forma_pagamento, valor_pago) VALUES
(1, 1, 100),
(2, 4, 83),
(3, 2, 400),
(3, 4, 176),
(4, 3, 43),
(5, 4, 128),
(6, 5, 140),
(7, 2, 150),
(8, 1, 60),
(9, 3, 85),
(10, 4, 90),
(11, 1, 43);

-- ============================================================
-- Atualização das sequences (sempre no maior id existente)
-- ============================================================
SELECT setval('public.cargo_id_cargo_seq', (SELECT MAX(id_cargo) FROM public.cargo), true);
SELECT setval('public.colecao_id_colecao_seq', (SELECT MAX(id_colecao) FROM public.colecao), true);
SELECT setval('public.produto_id_produto_seq', (SELECT MAX(id_produto) FROM public.produto), true);
SELECT setval('public.tom_id_tom_seq', (SELECT MAX(id_tom) FROM public.tom), true);
SELECT setval('public.produto_tom_id_produto_tom_seq', (SELECT MAX(id_produto_tom) FROM public.produto_tom), true);
SELECT setval('public.pedido_id_pedido_seq', (SELECT MAX(id_pedido) FROM public.pedido), true);
SELECT setval('public.forma_pagamento_id_forma_pagamento_seq', (SELECT MAX(id_forma_pagamento) FROM public.forma_pagamento), true);
SELECT setval('public.pagamento_id_pagamento_seq', (SELECT MAX(id_pagamento) FROM public.pagamento), true);

-- Adiciona o controle de entrega aos pedidos
ALTER TABLE pedido
ADD COLUMN IF NOT EXISTS entregue BOOLEAN NOT NULL DEFAULT FALSE;

-- Permite arquivar produtos sem apagar seu histórico
ALTER TABLE produto
ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- Índices para melhorar as consultas
CREATE INDEX IF NOT EXISTS idx_pedido_entregue
ON pedido (entregue);

CREATE INDEX IF NOT EXISTS idx_pedido_has_produto_pedido
ON pedido_has_produto (pedido_id_pedido);