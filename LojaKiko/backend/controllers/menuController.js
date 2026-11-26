
// menuController.js
const path = require('path');

exports.abrirMenu = (req, res) => {
    let dados = null;

    try {
        dados = JSON.parse(req.cookies.usuarioLogado || 'null');
    } catch (_) {
        dados = null;
    }

    // Funcionário precisa escolher o perfil.
    if (dados && dados.ehFuncionario && !dados.modo) {
        return res.redirect('/login/escolher-perfil');
    }

    // Funcionário no modo funcionário vai para os CRUDs.
    if (dados && dados.ehFuncionario && dados.modo === 'funcionario') {
        return res.redirect('/menu/cadastros');
    }

    // Vitrine pública: não exige login.
    return res.sendFile(
        path.join(__dirname, '../../frontend/menu.html')
    );
};

exports.logout = (req, res) => {
    // Implementação da rota logout
    res.send('Rota logout');
};

exports.abrirCadastros = (req, res) => {
    let usuario = null;

    try {
        usuario = JSON.parse(req.cookies.usuarioLogado || 'null');
    } catch (_) {}

    if (!usuario) {
        return res.redirect('/login');
    }

    if (!usuario.ehFuncionario || usuario.modo !== 'funcionario') {
        return res.redirect('/menu');
    }

    return res.sendFile(
        path.join(
            __dirname,
            '../../frontend/cadastros/cadastros.html'
        )
    );
};

// Abrir página de detalhes do produto
exports.abrirDetalheProduto = (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.redirect('/menu');
    }

    return res.sendFile(
        path.join(
            __dirname,
            '../../frontend/detalheProduto/detalheProduto.html'
        )
    );
};
