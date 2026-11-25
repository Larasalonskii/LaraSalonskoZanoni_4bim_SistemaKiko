const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

router.get('/', menuController.abrirMenu);

router.get('/produto/:id', menuController.abrirDetalheProduto);

router.get('/cadastros', menuController.abrirCadastros);

router.post('/logout', menuController.logout);

module.exports = router;