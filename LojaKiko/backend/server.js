
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');

// Banco de dados PostgreSQL
const db = require('./database');

// Configurações do servidor
const HOST = 'localhost';
const PORT_FIXA = 3001;

// ======================================================
// ARQUIVOS ESTÁTICOS
// ======================================================

// Frontend
const caminhoFrontend = path.join(__dirname, '../frontend');

console.log('Caminho frontend:', caminhoFrontend);

app.use(express.static(caminhoFrontend));

// Imagens antigas dos produtos
const caminhoImagensProduto = path.join(
    __dirname,
    '../imagens',
    'produto'
);

console.log('Caminho imagens dos produtos:', caminhoImagensProduto);

app.use(
    '/imagens-produtos',
    express.static(caminhoImagensProduto)
);

// Imagens dos tons dos produtos
const caminhoImagensTons = path.join(
    __dirname,
    '../imagens',
    'produtos'
);

console.log('Caminho imagens dos tons:', caminhoImagensTons);

app.use(
    '/imagens-produtos-tom',
    express.static(caminhoImagensTons)
);

// ======================================================
// MIDDLEWARES
// ======================================================

app.use(express.json());

app.use(cookieParser());

// CORS
app.use((req, res, next) => {

    const allowedOrigins = [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://localhost:5501',
        'http://127.0.0.1:5501',
        'http://localhost:3000',
        'http://localhost:3001'
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }

    res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
    );

    res.header(
        'Access-Control-Allow-Headers',
        'Content-Type'
    );

    res.header(
        'Access-Control-Allow-Credentials',
        'true'
    );

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Disponibiliza o banco nas requisições
app.use((req, res, next) => {
    req.db = db;
    next();
});

// ======================================================
// TRATAMENTO DE JSON MALFORMADO
// ======================================================

app.use((err, req, res, next) => {

    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        'body' in err
    ) {
        return res.status(400).json({
            error: 'JSON malformado',
            message: 'Verifique a sintaxe do JSON enviado'
        });
    }

    next(err);
});

// ======================================================
// IMPORTAÇÃO E REGISTRO DAS ROTAS
// ======================================================

// MENU
const menuRoutes = require('./routes/menuRoutes');
app.use('/menu', menuRoutes);

// IMAGENS
const imageRoutes = require('./routes/imageRoutes');
app.use('/', imageRoutes);

// CARGOS
const cargoRoutes = require('./routes/cargoRoutes');
app.use('/cargo', cargoRoutes);

// FORMAS DE PAGAMENTO
const forma_pagamentoRoutes = require('./routes/forma_pagamentoRoutes');
app.use('/forma_pagamento', forma_pagamentoRoutes);

// PRODUTOS
const produtoRoutes = require('./routes/produtoRoutes');
app.use('/produto', produtoRoutes);

// COLEÇÕES
const colecaoRoutes = require('./routes/colecaoRoutes');
app.use('/colecao', colecaoRoutes);

// CATEGORIAS DE PRODUTOS
const categoriaProdutoRoutes = require('./routes/categoriaProdutoRoutes');
app.use('/categoria-produto', categoriaProdutoRoutes);

// TONS
const tomRoutes = require('./routes/tomRoutes');
app.use('/tom', tomRoutes);

// PEDIDOS
const pedidoRoutes = require('./routes/pedidoRoutes');
app.use('/pedido', pedidoRoutes);

// RELACIONAMENTO PEDIDO E PRODUTO_TOM
const pedido_has_produtoRoutes = require('./routes/pedido_has_produtoRoutes');
app.use('/pedido_has_produto', pedido_has_produtoRoutes);

// CLIENTES
// Deve vir antes de pessoaRoutes
const clienteRoutes = require('./routes/clienteRoutes');
app.use('/cliente', clienteRoutes);

// FUNCIONÁRIOS
// Deve vir antes de pessoaRoutes
const funcionarioRoutes = require('./routes/funcionarioRoutes');
app.use('/funcionario', funcionarioRoutes);

// PESSOAS
const pessoaRoutes = require('./routes/pessoaRoutes');
app.use('/pessoa', pessoaRoutes);

// LOGIN
const loginRoutes = require('./routes/loginRoutes');
app.use('/login', loginRoutes);

// PAGAMENTOS
const pagamentoRoutes = require('./routes/pagamentoRoutes');
app.use('/pagamento', pagamentoRoutes);

// ======================================================
// ROTA PRINCIPAL
// ======================================================

app.get('/', (req, res) => {
    res.redirect('/menu');
});

// ======================================================
// TESTE DE CONEXÃO COM O BANCO
// ======================================================

app.get('/health', async (req, res) => {

    try {

        const connectionTest = await db.testConnection();

        if (connectionTest) {

            return res.status(200).json({
                status: 'OK',
                message: 'Servidor e banco de dados funcionando',
                database: 'PostgreSQL',
                timestamp: new Date().toISOString()
            });

        }

        return res.status(500).json({
            status: 'ERROR',
            message: 'Problema na conexão com o banco de dados',
            database: 'PostgreSQL',
            timestamp: new Date().toISOString()
        });

    } catch (error) {

        console.error('Erro no health check:', error);

        return res.status(500).json({
            status: 'ERROR',
            message: 'Erro interno do servidor',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ======================================================
// TRATAMENTO GLOBAL DE ERROS
// ======================================================

app.use((err, req, res, next) => {

    console.error('Erro não tratado:', err);

    res.status(500).json({
        error: 'Erro interno do servidor',
        message:
            process.env.NODE_ENV === 'development'
                ? err.message
                : 'Algo deu errado',
        timestamp: new Date().toISOString()
    });
});

// ======================================================
// ROTAS NÃO ENCONTRADAS (404)
// IMPORTANTE: DEVE SER A ÚLTIMA ROTA
// ======================================================

app.use((req, res) => {

    res.status(404).json({
        error: 'Rota não encontrada',
        message: `A rota ${req.originalUrl} não existe`,
        timestamp: new Date().toISOString()
    });
});

// ======================================================
// INICIALIZAÇÃO DO SERVIDOR
// ======================================================

const startServer = async () => {

    try {

        console.log('Testando conexão com PostgreSQL...');

        const connectionTest = await db.testConnection();

        if (!connectionTest) {

            console.error('Falha na conexão com PostgreSQL');

            process.exit(1);
        }

        console.log('PostgreSQL conectado com sucesso');

        const PORT = process.env.PORT || PORT_FIXA;

        app.listen(PORT, () => {

            console.log('');
            console.log(`Servidor rodando em http://${HOST}:${PORT}`);
            console.log(`Health check: http://${HOST}:${PORT}/health`);
            console.log(`Central/Menu: http://${HOST}:${PORT}/menu`);
            console.log('');

            const nomeDoBancoDeDados = db.pool.options.database;

            console.log(
                'Banco de dados PostgreSQL:',
                nomeDoBancoDeDados
            );

            console.log(
                'Ambiente:',
                process.env.NODE_ENV || 'development'
            );

            console.log('');
            console.log('Rotas carregadas:');
            console.log('- /menu');
            console.log('- /produto');
            console.log('- /categoria-produto');
            console.log('- /colecao');
            console.log('- /tom');
            console.log('- /pedido');
            console.log('- /pagamento');
            console.log('- /forma_pagamento');
            console.log('- /cliente');
            console.log('- /funcionario');
            console.log('- /pessoa');
            console.log('- /cargo');
            console.log('- /login');
        });
        
    } catch (error) {

        console.error('Erro ao iniciar o servidor:', error);

        process.exit(1);
    }
};

// ======================================================
// ENCERRAMENTO DO SERVIDOR
// ======================================================

process.on('SIGINT', async () => {

    console.log('\nEncerrando servidor...');

    try {

        await db.pool.end();

        console.log('Conexões com PostgreSQL encerradas');

        process.exit(0);

    } catch (error) {

        console.error('Erro ao encerrar conexões:', error);

        process.exit(1);
    }
});

process.on('SIGTERM', async () => {

    console.log('\nSIGTERM recebido. Encerrando servidor...');

    try {

        await db.pool.end();

        console.log('Conexões com PostgreSQL encerradas');

        process.exit(0);

    } catch (error) {

        console.error('Erro ao encerrar conexões:', error);

        process.exit(1);
    }
});

// ======================================================
// INICIAR
// ======================================================

startServer();
