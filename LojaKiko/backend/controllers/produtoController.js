
const { query, transaction } = require('../database');
const path = require('path');

const MAX_NOME_PRODUTO = 45;
const MAX_NOME_TOM = 40;

exports.abrirCrudProduto = (req, res) => {
    if (req.cookies.usuarioLogado) {
        return res.sendFile(
            path.join(__dirname, '../../frontend/produto/produto.html')
        );
    }

    res.redirect('/login');
};

const SELECT_PRODUTOS = `
    SELECT
        p.*,
        cp.nome_categoria_produto,
        c.nome_colecao,
        COALESCE(
            (
                SELECT json_agg(
                    json_build_object(
                        'id_produto_tom', pt.id_produto_tom,
                        'id_tom', t.id_tom,
                        'nome_tom', t.nome_tom,
                        'quantidade_estoque_tom', pt.quantidade_estoque_tom,
                        'imagem_produto_tom', pt.imagem_produto_tom
                    )
                    ORDER BY pt.id_produto_tom
                )
                FROM produto_tom pt
                JOIN tom t ON t.id_tom = pt.tom_id_tom
                WHERE pt.produto_id_produto = p.id_produto
            ),
            '[]'::json
        ) AS tons
    FROM produto p
    LEFT JOIN categoria_produto cp
        ON cp.id_categoria_produto =
           p.categoria_produto_id_categoria_produto
    LEFT JOIN colecao c
        ON c.id_colecao = p.colecao_id_colecao
`;

function validarTons(tons) {
    if (tons === undefined) return [];

    if (!Array.isArray(tons)) {
        throw new Error('A lista de tons precisa ser um array.');
    }

    return tons.map((tom) => {
        const nome = String(tom.nome_tom || '').trim();
        const estoque = Number(tom.quantidade_estoque_tom);

        if (!nome || nome.length > MAX_NOME_TOM) {
            throw new Error(
                `Cada tom precisa ter um nome de até ${MAX_NOME_TOM} caracteres.`
            );
        }

        if (!Number.isInteger(estoque) || estoque < 0) {
            throw new Error(`Estoque inválido para o tom "${nome}".`);
        }

        const id = tom.id_produto_tom
            ? Number(tom.id_produto_tom)
            : null;

        if (id !== null && (!Number.isInteger(id) || id <= 0)) {
            throw new Error('ID de tom inválido.');
        }

        return {
            id_produto_tom: id,
            nome_tom: nome,
            quantidade_estoque_tom: estoque
        };
    });
}


async function salvarTons(client, produtoId, tons) {
    // 1. Busca os tons que já pertencem ao produto ANTES das alterações.
    const resultadoAntigos = await client.query(
        `SELECT
            pt.id_produto_tom,
            pt.tom_id_tom
         FROM produto_tom pt
         WHERE pt.produto_id_produto = $1
         FOR UPDATE`,
        [produtoId]
    );

    const tonsAntigos = resultadoAntigos.rows;

    const idsAntigos = tonsAntigos.map(
        tom => Number(tom.id_produto_tom)
    );

    // 2. Identifica os IDs que vieram do formulário.
    const idsMantidos = tons
        .filter(tom => tom.id_produto_tom !== null)
        .map(tom => Number(tom.id_produto_tom));

    // Impede IDs duplicados.
    if (new Set(idsMantidos).size !== idsMantidos.length) {
        throw new Error('Existe um tom duplicado no formulário.');
    }

    // Confere se os IDs enviados pertencem ao produto.
    for (const id of idsMantidos) {
        if (!idsAntigos.includes(id)) {
            throw new Error(
                'Um dos tons informados não pertence a este produto.'
            );
        }
    }

    // 3. Atualiza os tons existentes e cadastra os novos.
    for (const tom of tons) {
        if (tom.id_produto_tom !== null) {
            await client.query(
                `UPDATE produto_tom
                 SET quantidade_estoque_tom = $1
                 WHERE id_produto_tom = $2
                   AND produto_id_produto = $3`,
                [
                    tom.quantidade_estoque_tom,
                    tom.id_produto_tom,
                    produtoId
                ]
            );

            await client.query(
                `UPDATE tom
                 SET nome_tom = $1
                 WHERE id_tom = (
                     SELECT tom_id_tom
                     FROM produto_tom
                     WHERE id_produto_tom = $2
                       AND produto_id_produto = $3
                 )`,
                [
                    tom.nome_tom,
                    tom.id_produto_tom,
                    produtoId
                ]
            );
        } else {
            const novoTom = await client.query(
                `INSERT INTO tom (nome_tom)
                 VALUES ($1)
                 RETURNING id_tom`,
                [tom.nome_tom]
            );

            await client.query(
                `INSERT INTO produto_tom (
                    produto_id_produto,
                    tom_id_tom,
                    quantidade_estoque_tom
                )
                VALUES ($1, $2, $3)`,
                [
                    produtoId,
                    novoTom.rows[0].id_tom,
                    tom.quantidade_estoque_tom
                ]
            );
        }
    }

    // 4. Descobre quais tons antigos foram removidos.
    // Tons novos não entram nesta lista.
    const idsRemovidos = idsAntigos.filter(
        id => !idsMantidos.includes(id)
    );

    for (const idTomProduto of idsRemovidos) {
        const usadoEmPedido = await client.query(
            `SELECT 1
             FROM pedido_has_produto
             WHERE produto_tom_id_produto_tom = $1
             LIMIT 1`,
            [idTomProduto]
        );

        if (usadoEmPedido.rows.length > 0) {
            const erro = new Error(
                'Não é possível remover este tom porque ele já está vinculado a um pedido. O histórico da venda precisa ser preservado.'
            );

            erro.status = 409;
            throw erro;
        }

        const tomAntigo = tonsAntigos.find(
            tom => Number(tom.id_produto_tom) === idTomProduto
        );

        // Remove a associação com o produto.
        await client.query(
            `DELETE FROM produto_tom
             WHERE id_produto_tom = $1
               AND produto_id_produto = $2`,
            [idTomProduto, produtoId]
        );

        // Exclui o registro do tom somente se não houver
        // nenhuma outra associação usando esse mesmo tom.
        await client.query(
            `DELETE FROM tom
             WHERE id_tom = $1
               AND NOT EXISTS (
                   SELECT 1
                   FROM produto_tom
                   WHERE tom_id_tom = $1
               )`,
            [tomAntigo.tom_id_tom]
        );
    }
}


exports.listarProdutos = async (req, res) => {
    try {
        const resultado = await query(
            `${SELECT_PRODUTOS}
             WHERE COALESCE(p.ativo, TRUE) = TRUE
             ORDER BY p.id_produto`
        );

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao listar produtos:', erro);
        res.status(500).json({ error: 'Erro ao listar produtos.' });
    }
};

exports.obterProduto = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        const resultado = await query(
            `${SELECT_PRODUTOS}
             WHERE p.id_produto = $1
               AND COALESCE(p.ativo, TRUE) = TRUE`,
            [id]
        );

        if (!resultado.rows.length) {
            return res.status(404).json({
                error: 'Produto não encontrado.'
            });
        }

        res.json(resultado.rows[0]);
    } catch (erro) {
        console.error('Erro ao buscar produto:', erro);
        res.status(500).json({ error: 'Erro ao buscar produto.' });
    }
};

exports.criarProduto = async (req, res) => {
    try {
        const {
            nome_produto,
            preco_unitario_produto,
            quantidade_estoque_produto,
            colecao_id_colecao,
            categoria_produto_id_categoria_produto
        } = req.body;

        const nome = String(nome_produto || '').trim();
        const preco = Number(preco_unitario_produto);
        const estoque = Number(quantidade_estoque_produto);
        const categoriaId = Number(categoria_produto_id_categoria_produto);

        const colecaoId = colecao_id_colecao
            ? Number(colecao_id_colecao)
            : null;

        const tons = validarTons(req.body.tons);

        if (!nome || nome.length > MAX_NOME_PRODUTO) {
            return res.status(400).json({
                error: `O nome deve ter até ${MAX_NOME_PRODUTO} caracteres.`
            });
        }

        if (!Number.isFinite(preco) || preco < 0) {
            return res.status(400).json({ error: 'Preço inválido.' });
        }

        if (!Number.isInteger(estoque) || estoque < 0) {
            return res.status(400).json({ error: 'Estoque inválido.' });
        }

        if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
            return res.status(400).json({
                error: 'Selecione uma categoria para o produto.'
            });
        }

        if (colecaoId !== null &&
            (!Number.isInteger(colecaoId) || colecaoId <= 0)) {
            return res.status(400).json({
                error: 'Coleção inválida.'
            });
        }

        const produto = await transaction(async (client) => {
            const inserido = await client.query(
                `INSERT INTO produto (
                    nome_produto,
                    preco_unitario_produto,
                    quantidade_estoque_produto,
                    colecao_id_colecao,
                    categoria_produto_id_categoria_produto,
                    ativo
                )
                VALUES ($1, $2, $3, $4, $5, TRUE)
                RETURNING *`,
                [nome, preco, estoque, colecaoId, categoriaId]
            );

            const produtoCriado = inserido.rows[0];

            await salvarTons(
                client,
                produtoCriado.id_produto,
                tons
            );

            return produtoCriado;
        });

        res.status(201).json(produto);
    } catch (erro) {
        console.error('Erro ao criar produto:', erro);

        res.status(erro.status || 400).json({
            error: erro.message || 'Erro ao criar produto.'
        });
    }
};

exports.atualizarProduto = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const {
            nome_produto,
            preco_unitario_produto,
            quantidade_estoque_produto,
            colecao_id_colecao,
            categoria_produto_id_categoria_produto
        } = req.body;

        const nome = String(nome_produto || '').trim();
        const preco = Number(preco_unitario_produto);
        const estoque = Number(quantidade_estoque_produto);
        const categoriaId = Number(categoria_produto_id_categoria_produto);

        const colecaoId = colecao_id_colecao
            ? Number(colecao_id_colecao)
            : null;

        const tons = req.body.tons !== undefined
            ? validarTons(req.body.tons)
            : null;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'ID inválido.' });
        }

        if (!nome || nome.length > MAX_NOME_PRODUTO) {
            return res.status(400).json({
                error: `O nome deve ter até ${MAX_NOME_PRODUTO} caracteres.`
            });
        }

        if (!Number.isFinite(preco) || preco < 0) {
            return res.status(400).json({ error: 'Preço inválido.' });
        }

        if (!Number.isInteger(estoque) || estoque < 0) {
            return res.status(400).json({ error: 'Estoque inválido.' });
        }

        if (!Number.isInteger(categoriaId) || categoriaId <= 0) {
            return res.status(400).json({
                error: 'Selecione uma categoria para o produto.'
            });
        }

        if (colecaoId !== null &&
            (!Number.isInteger(colecaoId) || colecaoId <= 0)) {
            return res.status(400).json({
                error: 'Coleção inválida.'
            });
        }

        const produto = await transaction(async (client) => {
            const atualizado = await client.query(
                `UPDATE produto
                 SET nome_produto = $1,
                     preco_unitario_produto = $2,
                     quantidade_estoque_produto = $3,
                     colecao_id_colecao = $4,
                     categoria_produto_id_categoria_produto = $5
                 WHERE id_produto = $6
                   AND COALESCE(ativo, TRUE) = TRUE
                 RETURNING *`,
                [
                    nome,
                    preco,
                    estoque,
                    colecaoId,
                    categoriaId,
                    id
                ]
            );

            if (!atualizado.rows.length) {
                const erro = new Error('Produto não encontrado.');
                erro.status = 404;
                throw erro;
            }

            // Sincroniza os tons somente quando o formulário os enviou
            if (tons !== null) {
                await salvarTons(client, id, tons);
            }

            return atualizado.rows[0];
        });

        res.json(produto);
    } catch (erro) {
        console.error('Erro ao atualizar produto:', erro);

        res.status(erro.status || 400).json({
            error: erro.message || 'Erro ao atualizar produto.'
        });
    }
};

exports.deletarProduto = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            error: 'ID de produto inválido.'
        });
    }

    try {
        const resultado = await query(
            `UPDATE produto p
             SET ativo = FALSE
             WHERE p.id_produto = $1
               AND COALESCE(p.ativo, TRUE) = TRUE
               AND NOT EXISTS (
                   SELECT 1
                   FROM produto_tom pt
                   JOIN pedido_has_produto php
                     ON php.produto_tom_id_produto_tom = pt.id_produto_tom
                   JOIN pedido pe
                     ON pe.id_pedido = php.pedido_id_pedido
                   WHERE pt.produto_id_produto = p.id_produto
                     AND COALESCE(pe.entregue, FALSE) = FALSE
               )
             RETURNING p.id_produto`,
            [id]
        );

        if (!resultado.rows.length) {
            const existe = await query(
                'SELECT id_produto FROM produto WHERE id_produto = $1',
                [id]
            );

            if (!existe.rows.length) {
                return res.status(404).json({
                    error: 'Produto não encontrado.'
                });
            }

            return res.status(409).json({
                error: 'Este produto está em um pedido que ainda não foi entregue. Não é possível arquivá-lo.'
            });
        }

        res.json({
            mensagem: 'Produto arquivado com sucesso!'
        });
    } catch (erro) {
        console.error('Erro ao arquivar produto:', erro);

        res.status(500).json({
            error: 'Erro ao arquivar produto.'
        });
    }
};
