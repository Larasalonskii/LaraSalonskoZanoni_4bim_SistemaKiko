const path = require('path');
const fs = require('fs/promises');
const axios = require('axios');
const { createCanvas, loadImage } = require('canvas');
const { query } = require('../database');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'imagens', 'produto');
const TONS_DIR = path.join(__dirname, '..', '..', 'imagens', 'produtos');

const ensureUploadDir = async (req, res, next) => {
    try {
        await fs.mkdir(UPLOAD_DIR, { recursive: true });
        await fs.mkdir(TONS_DIR, { recursive: true });

        next();

    } catch (error) {
        console.error('Erro ao criar diretórios de imagens:', error);

        res.status(500).json({
            error: 'Erro de configuração do servidor.'
        });
    }
};

async function converterParaPng(buffer) {
    const imagem = await loadImage(buffer);

    const canvas = createCanvas(imagem.width, imagem.height);
    const contexto = canvas.getContext('2d');

    contexto.drawImage(
        imagem,
        0,
        0,
        imagem.width,
        imagem.height
    );

    return canvas.toBuffer('image/png');
}

async function obterBufferImagem(req) {
    const { imageSource, imageUrl } = req.body;

    if (imageSource === 'local' && req.file) {
        return req.file.buffer;
    }

    if (imageSource === 'url' && imageUrl) {
        const resposta = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            maxContentLength: 10 * 1024 * 1024
        });

        return Buffer.from(resposta.data);
    }

    throw new Error('Envie um arquivo de imagem válido.');
}

// UPLOAD DA IMAGEM PRINCIPAL DO PRODUTO
const uploadImage = async (req, res) => {
    const { produtoId } = req.body;

    if (!/^\d+$/.test(String(produtoId || ''))) {
        return res.status(400).json({
            message: 'ID do produto inválido.'
        });
    }

    try {
        const buffer = await obterBufferImagem(req);

        if (!buffer || !buffer.length) {
            return res.status(400).json({
                message: 'Imagem vazia ou inválida.'
            });
        }

        const pngBuffer = await converterParaPng(buffer);

        const filename = `${produtoId}.png`;
        const finalPath = path.join(UPLOAD_DIR, filename);

        await fs.writeFile(finalPath, pngBuffer);

        res.status(200).json({
            message: 'Imagem do produto salva com sucesso!',
            filename,
            viewUrl: `/view-image/${produtoId}`
        });

    } catch (error) {
        console.error('Erro ao salvar imagem do produto:', error);

        res.status(500).json({
            message: 'Não foi possível processar a imagem do produto.',
            error: error.message
        });
    }
};

// EXIBIR IMAGEM PRINCIPAL DO PRODUTO
const viewImage = async (req, res) => {
    const { produtoId } = req.params;

    if (!/^\d+$/.test(String(produtoId || ''))) {
        return res.status(400).json({
            message: 'ID inválido.'
        });
    }

    const filePath = path.join(
        UPLOAD_DIR,
        `${produtoId}.png`
    );

    try {
        await fs.access(filePath);
        res.sendFile(filePath);

    } catch {
        res.status(404).json({
            message: `Imagem do produto ${produtoId} não encontrada.`
        });
    }
};

// UPLOAD DA FOTO DE UMA VARIAÇÃO DO PRODUTO
const uploadImageTom = async (req, res) => {
    const produtoTomId = Number(req.body.produtoTomId);

    if (!Number.isInteger(produtoTomId) || produtoTomId <= 0) {
        return res.status(400).json({
            message: 'ID da variação do produto inválido.'
        });
    }

    try {
        const resultado = await query(`
            SELECT
                pt.id_produto_tom,
                cp.nome_categoria_produto
            FROM produto_tom pt
            JOIN produto p
                ON p.id_produto = pt.produto_id_produto
            LEFT JOIN categoria_produto cp
                ON cp.id_categoria_produto =
                   p.categoria_produto_id_categoria_produto
            WHERE pt.id_produto_tom = $1
        `, [produtoTomId]);

        if (!resultado.rows.length) {
            return res.status(404).json({
                message: 'Variação do produto não encontrada.'
            });
        }

        const buffer = await obterBufferImagem(req);

        if (!buffer || !buffer.length) {
            return res.status(400).json({
                message: 'Imagem vazia ou inválida.'
            });
        }

        const pngBuffer = await converterParaPng(buffer);

        const categoria =
            resultado.rows[0].nome_categoria_produto || 'sem-categoria';

        const pastaCategoria = categoria
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        const diretorio = path.join(
            TONS_DIR,
            pastaCategoria
        );

        await fs.mkdir(diretorio, { recursive: true });

        const filename = `tom-${produtoTomId}.png`;

        const caminhoCompleto = path.join(
            diretorio,
            filename
        );

        await fs.writeFile(caminhoCompleto, pngBuffer);

        const caminhoBanco =
            `produtos/${pastaCategoria}/${filename}`;

        await query(
            `UPDATE produto_tom
             SET imagem_produto_tom = $1
             WHERE id_produto_tom = $2`,
            [caminhoBanco, produtoTomId]
        );

        res.status(200).json({
            message: 'Foto do tom salva com sucesso!',
            filename,
            imagem_produto_tom: caminhoBanco,
            viewUrl: `/imagens-produtos-tom/${caminhoBanco.replace(/^produtos\//, '')}`
        });

    } catch (error) {
        console.error('Erro ao salvar foto do tom:', error);

        res.status(500).json({
            message: 'Não foi possível salvar a foto do tom.',
            error: error.message
        });
    }
};

// EXIBIR FOTO DE UMA VARIAÇÃO
const viewImageTom = async (req, res) => {
    const produtoTomId = Number(req.params.produtoTomId);

    if (!Number.isInteger(produtoTomId) || produtoTomId <= 0) {
        return res.status(400).json({
            message: 'ID inválido.'
        });
    }

    try {
        const resultado = await query(
            `SELECT imagem_produto_tom
             FROM produto_tom
             WHERE id_produto_tom = $1`,
            [produtoTomId]
        );

        if (
            !resultado.rows.length ||
            !resultado.rows[0].imagem_produto_tom
        ) {
            return res.status(404).json({
                message: 'Foto deste tom não encontrada.'
            });
        }

        const caminhoRelativo =
            resultado.rows[0].imagem_produto_tom;

        const caminhoCompleto = path.resolve(
            TONS_DIR,
            '..',
            caminhoRelativo
        );

        const raizImagens = path.resolve(TONS_DIR);

        if (!caminhoCompleto.startsWith(raizImagens + path.sep)) {
            return res.status(400).json({
                message: 'Caminho de imagem inválido.'
            });
        }

        await fs.access(caminhoCompleto);
        res.sendFile(caminhoCompleto);

    } catch (error) {
        res.status(404).json({
            message: 'Foto deste tom não encontrada.'
        });
    }
};

module.exports = {
    ensureUploadDir,
    uploadImage,
    viewImage,
    uploadImageTom,
    viewImageTom
};