const loginController = require('./../controllers/loginController');

const express = require('express');
const router = express.Router();
const pedidoController = require('./../controllers/pedidoController');

// CRUD de Pedidos

router.get('/abrirCrudPedido', pedidoController.abrirCrudPedido);

router.get('/opcoes', pedidoController.listarOpcoes);

router.get('/', pedidoController.listarPedidos);

// Atualizar situação de entrega
router.patch('/:id/entrega', pedidoController.atualizarEntrega);

router.post(
    '/',
    loginController.exigirLoginParaCriarPedido,
    pedidoController.criarPedido
);

router.get('/:id', pedidoController.obterPedido);

router.put('/:id', pedidoController.atualizarPedido);

router.delete('/:id', pedidoController.deletarPedido);

router.patch('/:id/entrega', pedidoController.atualizarEntrega);

module.exports = router;