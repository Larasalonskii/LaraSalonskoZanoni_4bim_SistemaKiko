
const API_BASE_URL = window.location.origin;

// ======================================================
// VERIFICAR AUTORIZAÇÃO
// ======================================================


function handleUserAction(action) {

    if (action === 'entrar') {
        window.location.href = '/login';
        return;
    }

    if (action === 'sair') {
        fetch(`${API_BASE_URL}/login/logout`, {
            credentials: 'include'
        }).finally(() => {
            window.location.href = '/menu';
        });
    }
}


async function verificarAutorizacao() {

    try {

        const res = await fetch(
            `${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`,
            { credentials: 'include' }
        );

        const usuarioResposta = await res.json();

        const usuarioSelect = document.getElementById('oUsuario');

        if (usuarioSelect) {

            usuarioSelect.innerHTML = '';

            const opcaoConta = document.createElement('option');
            opcaoConta.value = '';

            if (usuarioResposta.status === 'ok') {

                const usuarioObjeto = JSON.parse(
                    usuarioResposta.usuario || '{}'
                );

                opcaoConta.textContent =
                    usuarioObjeto.nome || 'Minha conta';

                const opcaoSair = document.createElement('option');
                opcaoSair.value = 'sair';
                opcaoSair.textContent = 'Sair';

                usuarioSelect.append(opcaoConta, opcaoSair);

            } else {

                opcaoConta.textContent = 'Minha conta';

                const opcaoEntrar = document.createElement('option');
                opcaoEntrar.value = 'entrar';
                opcaoEntrar.textContent = 'Entrar';

                usuarioSelect.append(opcaoConta, opcaoEntrar);
            }
        }

        return usuarioResposta.status === 'ok';

    } catch (error) {

        console.error('Erro ao verificar login:', error);
        return false;
    }
}


// ======================================================
// FORMATAÇÃO DE PREÇO
// ======================================================

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2
    });
}

// ======================================================
// OBTER CARRINHO
// ======================================================

function obterCarrinho() {
    try {
        return JSON.parse(
            sessionStorage.getItem('carrinho')
        ) || [];
    } catch (error) {
        console.error('Erro ao ler carrinho:', error);
        return [];
    }
}

function salvarCarrinho(carrinho) {
    sessionStorage.setItem(
        'carrinho',
        JSON.stringify(carrinho)
    );

    carregarCarrinho();
}

// ======================================================
// CARREGAR CARRINHO
// ======================================================

function carregarCarrinho() {

    const carrinho = obterCarrinho();

    const corpo = document.getElementById('corpo-tabela');

    const totalGeral = document.getElementById('total-geral');

    const btnFinalizar =
        document.getElementById('btn-finalizar');

    const btnLimpar =
        document.getElementById('btn-limpar');

    corpo.innerHTML = '';

    let total = 0;

    if (carrinho.length === 0) {

        corpo.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:20px;">
                    Seu carrinho está vazio.
                </td>
            </tr>
        `;

        totalGeral.textContent =
            `Total: ${formatarPreco(0)}`;

        btnFinalizar.disabled = true;
        btnLimpar.disabled = true;

        return;
    }

    carrinho.forEach((item, index) => {

        // PREÇO POR UNIDADE
        const preco = Number(item.preco);

        // QUANTIDADE DE UNIDADES
        const quantidade = Number(item.quantidade);

        // SUBTOTAL = PREÇO X QUANTIDADE
        const subtotal = preco * quantidade;

        total += subtotal;

        const linha = document.createElement('tr');

        // ID
        const colunaId = document.createElement('td');
        colunaId.textContent = item.id;

        // NOME
        const colunaNome = document.createElement('td');
        colunaNome.textContent = item.nome;

        // QUANTIDADE
        const colunaQuantidade = document.createElement('td');

        const inputQuantidade = document.createElement('input');

        inputQuantidade.type = 'number';
        inputQuantidade.min = '1';
        inputQuantidade.step = '1';
        inputQuantidade.value = quantidade;

        inputQuantidade.style.width = '75px';

        if (Number.isFinite(Number(item.estoque))) {
            inputQuantidade.max = Number(item.estoque);
        }

        inputQuantidade.addEventListener('change', () => {
            atualizarQuantidade(index, inputQuantidade.value);
        });

        colunaQuantidade.appendChild(inputQuantidade);

        // PREÇO UNITÁRIO
        const colunaPreco = document.createElement('td');

        colunaPreco.textContent =
            `${formatarPreco(preco)} / unidade`;

        // SUBTOTAL
        const colunaSubtotal = document.createElement('td');

        colunaSubtotal.textContent =
            formatarPreco(subtotal);

        // REMOVER
        const colunaRemover = document.createElement('td');

        const botaoRemover = document.createElement('button');

        botaoRemover.textContent = 'Remover';
        botaoRemover.className = 'btn-remover';
        botaoRemover.type = 'button';

        botaoRemover.addEventListener('click', () => {
            removerItem(index);
        });

        colunaRemover.appendChild(botaoRemover);

        linha.append(
            colunaId,
            colunaNome,
            colunaQuantidade,
            colunaPreco,
            colunaSubtotal,
            colunaRemover
        );

        corpo.appendChild(linha);
    });

    // TOTAL FINAL
    totalGeral.textContent =
        `Total: ${formatarPreco(total)}`;

    btnFinalizar.disabled = false;
    btnLimpar.disabled = false;
}

// ======================================================
// ATUALIZAR QUANTIDADE
// ======================================================

function atualizarQuantidade(index, novaQtd) {

    const carrinho = obterCarrinho();

    const quantidade = Number(novaQtd);

    if (
        !Number.isInteger(quantidade) ||
        quantidade < 1
    ) {
        mostrarAlerta('A quantidade mínima é 1 unidade.');
        carregarCarrinho();
        return;
    }

    const item = carrinho[index];

    if (!item) return;

    // Verifica estoque quando disponível
    if (
        item.estoque !== undefined &&
        quantidade > Number(item.estoque)
    ) {
        mostrarAlerta(
            `Estoque insuficiente!\n` +
            `Disponível: ${item.estoque} unidade(s).`
        );

        carregarCarrinho();
        return;
    }

    carrinho[index].quantidade = quantidade;

    salvarCarrinho(carrinho);
}

// ======================================================
// REMOVER PRODUTO
// ======================================================

function removerItem(index) {

    const carrinho = obterCarrinho();

    carrinho.splice(index, 1);

    salvarCarrinho(carrinho);
}

// ======================================================
// LIMPAR CARRINHO
// ======================================================

function limparCarrinho() {

    if (
        confirm('Tem certeza que deseja limpar todo o carrinho?')
    ) {
        sessionStorage.removeItem('carrinho');

        carregarCarrinho();
    }
}

// ======================================================
// FINALIZAR PEDIDO
// ======================================================

function finalizarPedido() {

    const carrinho = obterCarrinho();

    if (carrinho.length === 0) {

        mostrarAlerta('Seu carrinho está vazio.');

        return;
    }

    // Verifica se todos os itens possuem dados válidos
    for (const item of carrinho) {

        if (
            !item.id ||
            !Number.isInteger(Number(item.quantidade)) ||
            Number(item.quantidade) < 1 ||
            !Number.isFinite(Number(item.preco)) ||
            Number(item.preco) < 0
        ) {
            mostrarAlerta(
                'Existe um produto com dados inválidos no carrinho.'
            );

            return;
        }
    }

    window.location.href = `${API_BASE_URL}/login/visaoclientefinalizar`;
}

// ======================================================
// EVENTOS
// ======================================================

document.addEventListener('DOMContentLoaded', () => {

    const btnFinalizar =
        document.getElementById('btn-finalizar');

    const btnLimpar =
        document.getElementById('btn-limpar');

    if (btnFinalizar) {
        btnFinalizar.addEventListener(
            'click',
            finalizarPedido
        );
    }

    if (btnLimpar) {
        btnLimpar.addEventListener(
            'click',
            limparCarrinho
        );
    }

    verificarAutorizacao();

    carregarCarrinho();
});
