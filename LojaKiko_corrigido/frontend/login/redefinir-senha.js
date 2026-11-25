
const form = document.getElementById('formNovaSenha');
const mensagem = document.getElementById('mensagem');
const botao = document.getElementById('btnSalvar');
const campoToken = document.getElementById('token');
const btnVoltarEmail = document.getElementById('btnVoltarEmail');

// Voltar para a página anterior, onde informou o e-mail
btnVoltarEmail.addEventListener('click', () => {
    window.history.back();
});

// Aceita somente números no campo do código
campoToken.addEventListener('input', () => {
    campoToken.value = campoToken.value.replace(/\D/g, '').slice(0, 6);
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const token = campoToken.value.trim();
    const senha = document.getElementById('senhaNova').value;
    const confirmar = document.getElementById('confirmarSenha').value;

    if (!/^\d{6}$/.test(token)) {
        mensagem.textContent =
            'Digite o código de 6 números recebido por e-mail.';
        return;
    }

    if (senha.length < 8) {
        mensagem.textContent =
            'A senha deve ter pelo menos 8 caracteres.';
        return;
    }

    if (senha !== confirmar) {
        mensagem.textContent = 'As senhas não coincidem.';
        return;
    }

    botao.disabled = true;
    botao.textContent = 'Alterando senha...';
    mensagem.textContent = '';

    try {
        const resposta = await fetch('/login/redefinir-senha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                token,
                senha
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || 'Não foi possível alterar a senha.'
            );
        }

        form.hidden = true;
        btnVoltarEmail.hidden = true;

        mensagem.textContent = dados.mensagem;

        sessionStorage.removeItem('emailRecuperacao');

    } catch (erro) {
        mensagem.textContent = erro.message;

        botao.disabled = false;
        botao.textContent = 'Alterar senha';
    }
});
