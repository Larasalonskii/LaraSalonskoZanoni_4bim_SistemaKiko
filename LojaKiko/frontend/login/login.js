let emailGlobal = '';
const API_BASE_URL = window.location.origin; // Define  o host e a porta do servidor


async function verificarEmail() {
    const email = document.getElementById("email").value.trim();
    if (!email) { mostrarAlerta('Informe seu e-mail.'); return; }
    emailGlobal = email;

    try {
        const response = await fetch(`${API_BASE_URL}/login/verificarEmail`, {
            credentials: 'include',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();
        console.log("Resposta do servidor sobre verificar o email: " + data.nome + " - " + data.status);

        if (data.status === 'existe') {
            document.getElementById("loginFrame").style.display = "none";
            document.getElementById("senhaFrame").style.display = "block";
            document.getElementById("nomeUsuario").innerText = `Olá, ${data.nome}`;
        } else {
            const cadastrar = confirm("E-mail não encontrado. Deseja se cadastrar?");
            if (cadastrar) {
                window.location.href = "/login/cadastro/cadastro.html?email=" + encodeURIComponent(email);
            }
        }
    } catch (erro) {
        console.error('Erro ao verificar e-mail:', erro);
        mostrarAlerta('Não foi possível conectar ao servidor. Confira se o sistema está iniciado.');
    }
}


async function verificarSenha() {
    const senha = document.getElementById("senha").value;
    if (!senha) { mostrarAlerta('Informe sua senha.'); return; }
    try {
        const res = await fetch(API_BASE_URL + '/login/verificarSenha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailGlobal, senha }),
            credentials: 'include'
        });


        const data = await res.json();
        console.log("verificarSenha -> Resposta do servidor: " + JSON.stringify(data));



        if (data.status === 'ok') {

            if (data.ehFuncionario) {
                window.location.href = '/login/escolher-perfil';

            } else {

                const parametros = new URLSearchParams(
                    window.location.search
                );

                const retorno = parametros.get('retorno');

                const destinosPermitidos = [
                    '/login/visaoclientefinalizar',
                    '/login/visaoclientepagamento',
                    '/pagamento/abrirTelaPagamento'
                ];

                window.location.href = destinosPermitidos.includes(retorno)
                    ? retorno
                    : '/menu';
            }

        }
        else {
            mostrarAlerta(data.status === 'senha_incorreta' ? 'Senha incorreta!' : (data.mensagem || 'Não foi possível entrar.'));
        }
    } catch (erro) {
        console.error('Erro ao entrar:', erro);
        mostrarAlerta('Não foi possível conectar ao servidor.');
    }
}

document.getElementById('btnVoltarEmail').addEventListener('click', () => {
    window.history.back();
});