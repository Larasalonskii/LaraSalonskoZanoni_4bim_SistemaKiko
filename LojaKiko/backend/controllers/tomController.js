const { query } = require('../database');
const path = require('path');

const MAX_NOME_TOM = 40;

exports.abrirCrudTom = (req, res) => {
    if (req.cookies.usuarioLogado) {
        return res.sendFile(
            path.join(__dirname, '../../frontend/tom/tom.html')
        );
    }

    return res.redirect('/login');
};

// A tabela TOM possui somente ID e nome.
// A categoria pertence ao produto.
// A imagem pertence à variação em PRODUTO_TOM.
const SELECT_TONS = `
    SELECT id_tom, nome_tom
    FROM tom
`;

function validarNomeTom(body) {
    const nome_tom = String(body.nome_tom || '').trim();

    if (!nome_tom) {
        throw new Error('O nome do tom é obrigatório.');
    }

    if (nome_tom.length > MAX_NOME_TOM) {
        throw new Error(
            `O nome do tom deve ter no máximo ${MAX_NOME_TOM} caracteres.`
        );
    }

    return nome_tom;
}

// LISTAR TONS
exports.listarTons = async (req, res) => {
    try {
        const result = await query(
            `${SELECT_TONS} ORDER BY id_tom`
        );

        res.json(result.rows);

    } catch (error) {
        console.error('Erro ao listar tons:', error);

        res.status(500).json({
            error: 'Erro interno ao listar tons.'
        });
    }
};

// CADASTRAR TOM
exports.criarTom = async (req, res) => {
    try {
        const nome_tom = validarNomeTom(req.body);

        const result = await query(
            `INSERT INTO tom (nome_tom)
             VALUES ($1)
             RETURNING id_tom, nome_tom`,
            [nome_tom]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar tom:', error);

        if (error.message && !error.code) {
            return res.status(400).json({
                error: error.message
            });
        }

        res.status(500).json({
            error: 'Erro interno ao cadastrar tom.'
        });
    }
};

// BUSCAR TOM POR ID
exports.obterTom = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID deve ser um número válido.'
            });
        }

        const result = await query(
            `${SELECT_TONS} WHERE id_tom = $1`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                error: 'Tom não encontrado.'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao obter tom:', error);

        res.status(500).json({
            error: 'Erro interno ao buscar tom.'
        });
    }
};

// ALTERAR TOM
exports.atualizarTom = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID deve ser um número válido.'
            });
        }

        const nome_tom = validarNomeTom(req.body);

        const result = await query(
            `UPDATE tom
             SET nome_tom = $1
             WHERE id_tom = $2
             RETURNING id_tom, nome_tom`,
            [nome_tom, id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                error: 'Tom não encontrado.'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao atualizar tom:', error);

        if (error.message && !error.code) {
            return res.status(400).json({
                error: error.message
            });
        }

        res.status(500).json({
            error: 'Erro interno ao atualizar tom.'
        });
    }
};

// EXCLUIR TOM
exports.deletarTom = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID deve ser um número válido.'
            });
        }

        const result = await query(
            `DELETE FROM tom
             WHERE id_tom = $1
             RETURNING id_tom`,
            [id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                error: 'Tom não encontrado.'
            });
        }

        res.status(204).send();

    } catch (error) {
        console.error('Erro ao deletar tom:', error);

        if (error.code === '23503') {
            return res.status(409).json({
                error: 'Não é possível excluir este tom porque ele está associado a um produto ou pedido.'
            });
        }

        res.status(500).json({
            error: 'Erro interno ao excluir tom.'
        });
    }
};