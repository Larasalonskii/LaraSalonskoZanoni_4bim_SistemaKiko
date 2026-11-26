
const path = require('path');
const { query } = require('../database');

exports.abrirCrudCategoriaProduto = (req, res) => {
    const usuario = req.cookies.usuarioLogado;

    if (!usuario) {
        return res.redirect('/login');
    }

    res.sendFile(
        path.join(
            __dirname,
            '../../frontend/categoria-produto/categoria-produto.html'
        )
    );
};

exports.listarCategorias = async (req, res) => {
    try {
        const resultado = await query(`
            SELECT
                id_categoria_produto,
                nome_categoria_produto
            FROM categoria_produto
            ORDER BY nome_categoria_produto
        `);

        res.status(200).json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar categorias:', erro);
        res.status(500).json({
            erro: 'Erro ao listar categorias.'
        });
    }
};

exports.obterCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await query(`
            SELECT
                id_categoria_produto,
                nome_categoria_produto
            FROM categoria_produto
            WHERE id_categoria_produto = $1
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Categoria não encontrada.'
            });
        }

        res.status(200).json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao buscar categoria:', erro);
        res.status(500).json({
            erro: 'Erro ao buscar categoria.'
        });
    }
};

exports.criarCategoria = async (req, res) => {
    try {
        const { nome_categoria_produto } = req.body;

        if (!nome_categoria_produto || !nome_categoria_produto.trim()) {
            return res.status(400).json({
                erro: 'Informe o nome da categoria.'
            });
        }

        const nome = nome_categoria_produto.trim();

        const resultado = await query(`
            INSERT INTO categoria_produto (
                nome_categoria_produto
            )
            VALUES ($1)
            RETURNING *
        `, [nome]);

        res.status(201).json({
            mensagem: 'Categoria cadastrada com sucesso!',
            categoria: resultado.rows[0]
        });
    } catch (erro) {
        console.error('Erro ao cadastrar categoria:', erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Já existe uma categoria com esse nome.'
            });
        }

        res.status(500).json({
            erro: 'Erro ao cadastrar categoria.'
        });
    }
};

exports.atualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome_categoria_produto } = req.body;

        if (!nome_categoria_produto || !nome_categoria_produto.trim()) {
            return res.status(400).json({
                erro: 'Informe o nome da categoria.'
            });
        }

        const resultado = await query(`
            UPDATE categoria_produto
            SET nome_categoria_produto = $1
            WHERE id_categoria_produto = $2
            RETURNING *
        `, [nome_categoria_produto.trim(), id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Categoria não encontrada.'
            });
        }

        res.status(200).json({
            mensagem: 'Categoria atualizada com sucesso!',
            categoria: resultado.rows[0]
        });
    } catch (erro) {
        console.error('Erro ao atualizar categoria:', erro);

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Já existe uma categoria com esse nome.'
            });
        }

        res.status(500).json({
            erro: 'Erro ao atualizar categoria.'
        });
    }
};

exports.deletarCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await query(`
            DELETE FROM categoria_produto
            WHERE id_categoria_produto = $1
            RETURNING *
        `, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                erro: 'Categoria não encontrada.'
            });
        }

        res.status(200).json({
            mensagem: 'Categoria excluída com sucesso!'
        });
    } catch (erro) {
        console.error('Erro ao excluir categoria:', erro);

        if (erro.code === '23503') {
            return res.status(409).json({
                erro: 'Não é possível excluir esta categoria porque existem produtos vinculados a ela.'
            });
        }

        res.status(500).json({
            erro: 'Erro ao excluir categoria.'
        });
    }
};
