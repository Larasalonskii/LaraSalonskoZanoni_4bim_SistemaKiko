
const API_BASE_URL = window.location.origin;

function formatarPreco(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatarData(data) {
    if (!data) return 'Data não informada';

    const partes = String(data).split('-');

    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);

    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;

    return elemento;
}

function obterStatus(pedido) {
    const total = Number(pedido.valor_total || 0);
    const pago = Number(pedido.valor_pago || 0);

    if (pedido.entregue) {
        return {
            texto: 'Entregue',
            classe: 'status-entregue'
        };
    }

    if (total > 0 && pago >= total) {
        return {
            texto: 'Pago',
            classe: 'status-pago'
        };
    }

    if (pago > 0) {
        return {
            texto: 'Pagamento parcial',
            classe: 'status-parcial'
        };
    }

    return {
        texto: 'Aguardando pagamento',
        classe: 'status-pendente'
    };
}

function criarDetalhes(pedido) {
    const detalhes = criarElemento('div', 'pedido-detalhes');

    const titulo = criarElemento('h3', '', 'Itens do pedido');
    detalhes.appendChild(titulo);

    const itens = Array.isArray(pedido.itens) ? pedido.itens : [];

    if (itens.length === 0) {
        detalhes.appendChild(
            criarElemento('p', 'item-tom', 'Nenhum item encontrado.')
        );
    }

    itens.forEach(item => {
        const linha = criarElemento('div', 'item-pedido');

        const identificacao = criarElemento('div');

        identificacao.appendChild(
            criarElemento('span', 'item-nome', item.nome_produto || 'Produto')
        );

        identificacao.appendChild(
            criarElemento('span', 'item-tom', `Tom: ${item.nome_tom || 'Não informado'}`)
        );

        const quantidade = Number(item.quantidade || 0);
        const preco = Number(item.preco_unitario || 0);

        const valor = criarElemento(
            'span',
            'item-quantidade',
            `${quantidade} un. × ${formatarPreco(preco)} = ${formatarPreco(quantidade * preco)}`
        );

        linha.appendChild(identificacao);
        linha.appendChild(valor);

        detalhes.appendChild(linha);
    });

    const pagamentos = Array.isArray(pedido.formas_pagamento)
        ? pedido.formas_pagamento
        : [];

    if (pagamentos.length > 0) {
        const areaPagamentos = criarElemento('div', 'pagamentos-info');

        areaPagamentos.appendChild(
            criarElemento('h3', '', 'Pagamentos registrados')
        );

        pagamentos.forEach(pagamento => {
            areaPagamentos.appendChild(
                criarElemento(
                    'p',
                    '',
                    `${pagamento.nome_forma_pagamento}: ${formatarPreco(pagamento.valor_pago)}`
                )
            );
        });

        detalhes.appendChild(areaPagamentos);
    }

    return detalhes;
}

function criarCardPedido(pedido) {
    const card = criarElemento('article', 'pedido-card');

    const topo = criarElemento('div', 'pedido-topo');
    const identificacao = criarElemento('div', 'pedido-identificacao');

    identificacao.appendChild(
        criarElemento('span', 'pedido-numero', `Pedido #${pedido.id_pedido}`)
    );

    identificacao.appendChild(
        criarElemento('span', 'pedido-data', `Realizado em ${formatarData(pedido.data_pedido)}`)
    );

    const status = obterStatus(pedido);

    topo.appendChild(identificacao);
    topo.appendChild(
        criarElemento('span', `status ${status.classe}`, status.texto)
    );

    const corpo = criarElemento('div', 'pedido-corpo');
    const informacoes = criarElemento('div', 'pedido-informacoes');

    const total = criarElemento('div', 'info-item');
    total.appendChild(criarElemento('span', '', 'Valor total'));
    total.appendChild(
        criarElemento('strong', 'valor', formatarPreco(pedido.valor_total))
    );

    const pago = criarElemento('div', 'info-item');
    pago.appendChild(criarElemento('span', '', 'Valor pago'));
    pago.appendChild(
        criarElemento('strong', '', formatarPreco(pedido.valor_pago))
    );

    const quantidadeItens = Array.isArray(pedido.itens)
        ? pedido.itens.reduce((soma, item) => soma + Number(item.quantidade || 0), 0)
        : 0;

    const unidades = criarElemento('div', 'info-item');
    unidades.appendChild(criarElemento('span', '', 'Unidades'));
    unidades.appendChild(
        criarElemento('strong', '', String(quantidadeItens))
    );

    informacoes.appendChild(total);
    informacoes.appendChild(pago);
    informacoes.appendChild(unidades);

    const botao = criarElemento('button', 'btn-detalhes', 'Ver detalhes');
    botao.type = 'button';

    const detalhes = criarDetalhes(pedido);

    botao.addEventListener('click', () => {
        const aberto = detalhes.classList.toggle('aberto');
        botao.textContent = aberto ? 'Fechar detalhes' : 'Ver detalhes';
    });

    corpo.appendChild(informacoes);
    corpo.appendChild(botao);

    card.appendChild(topo);
    card.appendChild(corpo);
    card.appendChild(detalhes);

    return card;
}

async function carregarMeusPedidos() {
    const lista = document.getElementById('lista-pedidos');
    const mensagem = document.getElementById('mensagem-carregamento');
    const botao = document.getElementById('btn-atualizar');

    lista.innerHTML = '';
    mensagem.hidden = false;
    mensagem.className = 'mensagem';
    mensagem.textContent = 'Carregando seus pedidos...';

    botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/pedido/meus-pedidos`,
            {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            }
        );

        const dados = await resposta.json().catch(() => null);

        if (resposta.status === 401 || resposta.status === 403) {
            window.location.href =
                '/login?retorno=' +
                encodeURIComponent('/login/visaoclientepedidos');
            return;
        }

        if (!resposta.ok) {
            throw new Error(
                dados?.error || 'Não foi possível carregar seus pedidos.'
            );
        }

        if (!Array.isArray(dados)) {
            throw new Error('O servidor retornou uma resposta inesperada.');
        }

        const entregues = dados.filter(pedido => pedido.entregue).length;

        document.getElementById('quantidade-pedidos').textContent = dados.length;
        document.getElementById('quantidade-entregues').textContent = entregues;

        if (dados.length === 0) {
            mensagem.textContent = 'Você ainda não realizou nenhum pedido. Que tal escolher seus produtos favoritos?';
            return;
        }

        mensagem.hidden = true;

        dados.forEach(pedido => {
            lista.appendChild(criarCardPedido(pedido));
        });

    } catch (erro) {
        console.error('Erro ao carregar meus pedidos:', erro);

        mensagem.hidden = false;
        mensagem.className = 'mensagem erro';
        mensagem.textContent = erro.message;

    } finally {
        botao.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document
        .getElementById('btn-atualizar')
        .addEventListener('click', carregarMeusPedidos);

    carregarMeusPedidos();
});
