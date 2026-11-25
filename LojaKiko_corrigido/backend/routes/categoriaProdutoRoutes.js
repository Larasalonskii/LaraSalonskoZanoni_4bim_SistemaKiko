const express = require('express');
const router = express.Router();

const controller = require('../controllers/categoriaProdutoController');

router.get(
    '/abrirCrudCategoriaProduto',
    controller.abrirCrudCategoriaProduto
);

router.get('/', controller.listarCategorias);
router.post('/', controller.criarCategoria);
router.get('/:id', controller.obterCategoria);
router.put('/:id', controller.atualizarCategoria);
router.delete('/:id', controller.deletarCategoria);

module.exports = router;