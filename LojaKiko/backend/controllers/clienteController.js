
const { query } = require('../database');
const path = require('path');

const SELECT_CLIENTE = `
    SELECT
        cli.pessoa_cpf_pessoa,
        p.nome_pessoa,
        to_char(cli.data_cadastro_cliente, 'DD/MM/YYYY') AS data_cadastro_cliente
    FROM cliente cli
    JOIN pessoa p ON p.cpf_pessoa = cli.pessoa_cpf_pessoa
`;

exports.abrirTabelaClientes = (req, res) => {
    if (!req.cookies.usuarioLogado) {
        return res.redirect('/login');
    }

    res.sendFile(
        path.join(__dirname, '../../frontend/cliente/cliente_tabela.html')
    );
};

exports.listarClientes = async (req, res) => {
    try {
        const resultado = await query(`
            ${SELECT_CLIENTE}
            ORDER BY p.nome_pessoa
        `);

        res.json(resultado.rows);
    } catch (error) {
        console.error('Erro ao listar clientes:', error);

        res.status(500).json({
            error: 'Erro interno ao consultar clientes.'
        });
    }
};
