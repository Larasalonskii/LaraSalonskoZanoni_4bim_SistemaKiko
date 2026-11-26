
document.getElementById('formRecuperacao').addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('emailRecuperacao').value.trim();
    const botao = document.getElementById('btnEnviar');
    const mensagem = document.getElementById('mensagem');

    botao.disabled = true;
    botao.textContent = 'Enviando código...';
    mensagem.textContent = '';

    try {
        const resposta = await fetch('/login/solicitar-recuperacao-senha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || 'Não foi possível enviar o código.'
            );
        }

        mensagem.textContent = dados.mensagem;

        sessionStorage.setItem('emailRecuperacao', email);

        setTimeout(() => {
            window.location.href = '/login/redefinir-senha';
        }, 1500);

    } catch (erro) {
        mensagem.textContent = erro.message;

        botao.disabled = false;
        botao.textContent = 'Enviar código';
    }
});
