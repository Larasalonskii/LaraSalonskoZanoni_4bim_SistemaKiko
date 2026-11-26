function mostrarAlerta(mensagem) {
    // Remove um alerta anterior, caso exista
    const alertaAnterior = document.querySelector('.alerta-kiko');

    if (alertaAnterior) {
        alertaAnterior.remove();
    }

    // Cria o alerta
    const alerta = document.createElement('div');
    alerta.className = 'alerta-kiko';

    const texto = document.createElement('span');
    texto.textContent = mensagem;

    const botaoFechar = document.createElement('button');
    botaoFechar.className = 'alerta-fechar';
    botaoFechar.innerHTML = '×';
    botaoFechar.setAttribute('aria-label', 'Fechar alerta');

    alerta.appendChild(texto);
    alerta.appendChild(botaoFechar);

    document.body.appendChild(alerta);

    // Função para fechar
    function fecharAlerta() {
        alerta.classList.add('saindo');

        setTimeout(() => {
            alerta.remove();
        }, 400);
    }

    // Fecha ao clicar no X
    botaoFechar.addEventListener('click', fecharAlerta);

    // Fecha sozinho depois de 4 segundos
    setTimeout(fecharAlerta, 4000);
}