
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

router.get('/abrirTabelaClientes', clienteController.abrirTabelaClientes);
router.get('/', clienteController.listarClientes);

module.exports = router;
