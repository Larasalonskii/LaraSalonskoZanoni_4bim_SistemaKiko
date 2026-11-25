
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

const SELECT_TONS = `
    SELECT
        t.id_tom,
        t.nome_tom,
        t.categoria_produto_id_categoria_produto,
        t.imagem_tom,
        cp.nome_categoria_produto
    FROM tom t
    LEFT JOIN categoria_produto cp
      ON cp.id_categoria_produto =
         t.categoria_produto_id_categoria_produto
`;

function validarDados(body) {
    const nome_tom = String(body.nome_tom || '').trim();
    const categoriaId = Number(
        body.categoria_produto_id_categoria_produto
    );

    if (!nome_tom) {
        throw new Error('O nome do tom é obrigatório.');
    }

    if (nome_tom.length > MAX_NOME_TOM) {
        throw new Error(
            `O nome do tom deve ter no máximo ${MAX_NOME_TOM} caracteres.`
        );
    }

    if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
        throw new Error('Selecione a categoria deste tom.');
    }

    return { nome_tom, categoriaId };
}

exports.listarTons = async (req, res) => {
    try {
        const result = await query(
            `${SELECT_TONS} ORDER BY t.id_tom`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar tons:', error);

        res.status(500).json({
            error: 'Erro interno ao listar tons.'
        });
    }
};

exports.criarTom = async (req, res) => {
    try {
        const { nome_tom, categoriaId } = validarDados(req.body);

        const result = await query(
            `INSERT INTO tom (
                nome_tom,
                categoria_produto_id_categoria_produto
            )
            VALUES ($1, $2)
            RETURNING *`,
            [nome_tom, categoriaId]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao criar tom:', error);

        if (error.message && !error.code) {
            return res.status(400).json({
                error: error.message
            });
        }

        if (error.code === '23503') {
            return res.status(400).json({
                error: 'A categoria selecionada não existe.'
            });
        }

        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Já existe um tom com esses dados.'
            });
        }

        res.status(500).json({
            error: 'Erro interno ao cadastrar tom.'
        });
    }
};

exports.obterTom = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID deve ser um número válido.'
            });
        }

        const result = await query(
            `${SELECT_TONS} WHERE t.id_tom = $1`,
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

exports.atualizarTom = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID deve ser um número válido.'
            });
        }

        const { nome_tom, categoriaId } = validarDados(req.body);

        const result = await query(
            `UPDATE tom
             SET nome_tom = $1,
                 categoria_produto_id_categoria_produto = $2
             WHERE id_tom = $3
             RETURNING *`,
            [nome_tom, categoriaId, id]
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

        if (error.code === '23503') {
            return res.status(400).json({
                error: 'A categoria selecionada não existe.'
            });
        }

        res.status(500).json({
            error: 'Erro interno ao atualizar tom.'
        });
    }
};

exports.deletarTom = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID deve ser um número válido.'
            });
        }

        const result = await query(
            'DELETE FROM tom WHERE id_tom = $1 RETURNING id_tom',
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
            return res.status(400).json({
                error: 'Não é possível excluir este tom: ele está associado a um produto ou pedido.'
            });
        }

        res.status(500).json({
            error: 'Erro interno ao excluir tom.'
        });
    }
};
