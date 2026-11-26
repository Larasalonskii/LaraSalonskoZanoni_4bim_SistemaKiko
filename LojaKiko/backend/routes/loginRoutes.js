
const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Rotas de autenticação

router.get('/', loginController.abrirTelaLogin);

router.get('/escolher-perfil', loginController.abrirEscolhaPerfil);

router.post('/selecionarModo', loginController.selecionarModo);

// Área do cliente
router.get('/visaocliente', loginController.abrirVisaoCliente);

router.get(
    '/visaoclientecarrinho',
    loginController.abrirVisaoClienteCarrinho
);

router.get(
    '/visaoclientefinalizar',
    loginController.exigirClienteParaPagina,
    loginController.abrirVisaoClienteFinalizar
);

router.get(
    '/visaoclientepagamento',
    loginController.exigirClienteParaPagina,
    loginController.abrirVisaoClientePagamento
);

router.get(
    '/visaoclientepedidos',
    loginController.exigirClienteParaPagina,
    loginController.abrirVisaoClientePedidos
);

// Recuperação de senha
router.post(
    '/solicitar-recuperacao-senha',
    loginController.solicitarRecuperacaoSenha
);

router.get(
    '/redefinir-senha',
    loginController.abrirTelaRedefinirSenha
);

router.get(
    '/validar-token-recuperacao',
    loginController.validarTokenRecuperacao
);

router.post(
    '/redefinir-senha',
    loginController.redefinirSenha
);

// Login e sessão
router.post('/verificarEmail', loginController.verificarEmail);

router.post('/verificarSenha', loginController.verificarSenha);

router.get(
    '/verificaSeUsuarioEstaLogado',
    loginController.verificaSeUsuarioEstaLogado
);

router.get('/logout', loginController.logout);

// Cadastro de pessoas
router.post('/cadastrar', loginController.cadastrar);

router.post('/', loginController.criarPessoa);

router.get('/:id', loginController.obterPessoa);

// router.put('/:id', loginController.atualizarPessoa);
// router.delete('/:id', loginController.deletarPessoa);

module.exports = router;
