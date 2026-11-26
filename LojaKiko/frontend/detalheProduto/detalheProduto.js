const API_BASE_URL = window.location.origin;

const produtoId = Number(
    window.location.pathname.split('/').filter(Boolean).pop()
);

const imagemPrincipal = document.getElementById('imagemPrincipal');
const miniaturas = document.getElementById('miniaturas');
const gradeTons = document.getElementById('gradeTons');
const nomeTomSelecionado = document.getElementById('nomeTomSelecionado');
const estoqueTom = document.getElementById('estoqueTom');
const quantidadeInput = document.getElementById('quantidade');
const btnMenos = document.getElementById('menos');
const btnMais = document.getElementById('mais');
const btnAdicionar = document.getElementById('adicionarCarrinho');

let produtoAtual = null;
let tomAtual = null;

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function obterCarrinho() {
    try {
        return JSON.parse(sessionStorage.getItem('carrinho') || '[]');
    } catch (_) {
        return [];
    }
}

function atualizarContador() {
    const total = obterCarrinho().reduce(
        (soma, item) => soma + Number(item.quantidade || 0),
        0
    );

    document.getElementById('contadorCarrinho').textContent = total;
}

function imagemTomUrl(tom) {
    return `${API_BASE_URL}/view-image-tom/${tom.id_produto_tom}`;
}

function selecionarTom(tom) {
    tomAtual = tom;

    const estoque = Number(tom.quantidade_estoque_tom || 0);

    nomeTomSelecionado.textContent =
        `Tom selecionado: ${tom.nome_tom}`;

    estoqueTom.textContent = estoque > 0
        ? `${estoque} unidade(s) disponíveis`
        : 'Sem estoque deste tom';

    quantidadeInput.disabled = estoque <= 0;
    quantidadeInput.max = estoque;
    quantidadeInput.value = estoque > 0 ? 1 : 0;

    btnMenos.disabled = estoque <= 0;
    btnMais.disabled = estoque <= 0;
    btnAdicionar.disabled = estoque <= 0;

    btnAdicionar.textContent = estoque > 0
        ? 'ADICIONAR AO CARRINHO'
        : 'SEM ESTOQUE';

    const url = imagemTomUrl(tom);

    imagemPrincipal.src = url;

    imagemPrincipal.onerror = () => {
        imagemPrincipal.onerror = null;
        imagemPrincipal.src =
            `${API_BASE_URL}/view-image/${produtoAtual.id_produto}`;
    };

    gradeTons.querySelectorAll('.tom-opcao').forEach(el => {
        el.classList.toggle(
            'selecionado',
            Number(el.dataset.id) === Number(tom.id_produto_tom)
        );
    });
}

function criarMiniatura(src, alt, aoClicar) {
    const botao = document.createElement('button');

    botao.type = 'button';
    botao.className = 'miniatura';
    botao.setAttribute('aria-label', alt);

    const img = document.createElement('img');

    img.src = src;
    img.alt = alt;

    img.onerror = () => {
        botao.hidden = true;
    };

    botao.appendChild(img);
    botao.addEventListener('click', aoClicar);

    miniaturas.appendChild(botao);
}

function renderizarProduto(produto) {
    produtoAtual = produto;

    document.title = `${produto.nome_produto} | Kiko Milano`;

    document.getElementById('nomeProduto').textContent =
        produto.nome_produto || 'Produto';

    document.getElementById('categoriaProduto').textContent =
        produto.nome_categoria_produto || 'MAQUIAGEM';

    document.getElementById('colecaoProduto').textContent =
        produto.nome_colecao || '';

    document.getElementById('precoProduto').textContent =
        formatarPreco(produto.preco_unitario_produto);

    const fotoProduto =
        `${API_BASE_URL}/view-image/${produto.id_produto}`;

    imagemPrincipal.src = fotoProduto;

    imagemPrincipal.onerror = () => {
        imagemPrincipal.onerror = null;
        imagemPrincipal.src = '/imagem-sem-foto.svg';
    };

    criarMiniatura(
        fotoProduto,
        'Foto principal do produto',
        () => {
            imagemPrincipal.src = fotoProduto;
        }
    );

    const tons = Array.isArray(produto.tons)
        ? produto.tons
        : [];

    if (!tons.length) {
        gradeTons.innerHTML =
            '<p class="sem-tons">Este produto ainda não possui tons cadastrados.</p>';

        btnAdicionar.textContent = 'INDISPONÍVEL';

        document.getElementById('produtoDetalhe').hidden = false;
        document.getElementById('carregando').hidden = true;

        return;
    }

    tons.forEach(tom => {
        const botao = document.createElement('button');

        botao.type = 'button';
        botao.className = 'tom-opcao';
        botao.dataset.id = tom.id_produto_tom;

        const img = document.createElement('img');

        img.src = imagemTomUrl(tom);
        img.alt = `Foto do tom ${tom.nome_tom}`;

        img.onerror = () => {
            img.onerror = null;
            img.src = fotoProduto;
        };

        const nome = document.createElement('span');

        nome.textContent = tom.nome_tom;

        botao.append(img, nome);

        botao.addEventListener('click', () => {
            selecionarTom(tom);
        });

        gradeTons.appendChild(botao);

        criarMiniatura(
            imagemTomUrl(tom),
            `Tom ${tom.nome_tom}`,
            () => selecionarTom(tom)
        );
    });

    document.getElementById('produtoDetalhe').hidden = false;
    document.getElementById('carregando').hidden = true;
}

async function carregarProduto() {
    if (!Number.isInteger(produtoId) || produtoId <= 0) {
        document.getElementById('carregando').textContent =
            'Produto inválido.';

        return;
    }

    try {
        const resposta = await fetch(
            `${API_BASE_URL}/produto/${produtoId}`
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.error || 'Não foi possível carregar o produto.'
            );
        }

        renderizarProduto(dados);

    } catch (erro) {
        document.getElementById('carregando').textContent =
            erro.message;
    }
}

btnMenos.addEventListener('click', () => {
    const atual = Number(quantidadeInput.value || 1);

    quantidadeInput.value = Math.max(1, atual - 1);
});

btnMais.addEventListener('click', () => {
    if (!tomAtual) return;

    const atual = Number(quantidadeInput.value || 1);
    const maximo = Number(tomAtual.quantidade_estoque_tom || 0);

    quantidadeInput.value = Math.min(maximo, atual + 1);
});

quantidadeInput.addEventListener('change', () => {
    if (!tomAtual) return;

    const maximo = Number(tomAtual.quantidade_estoque_tom || 0);
    const valor = Math.floor(Number(quantidadeInput.value));

    quantidadeInput.value = Math.min(
        maximo,
        Math.max(1, Number.isFinite(valor) ? valor : 1)
    );
});

btnAdicionar.addEventListener('click', () => {
    if (!produtoAtual || !tomAtual) {
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta('Selecione um tom primeiro.');
        }

        return;
    }

    const quantidade = Number(quantidadeInput.value);
    const estoque = Number(tomAtual.quantidade_estoque_tom);

    if (
        !Number.isInteger(quantidade) ||
        quantidade < 1 ||
        quantidade > estoque
    ) {
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta(
                'Quantidade inválida para o estoque deste tom.'
            );
        }

        return;
    }

    const carrinho = obterCarrinho();

    const idProdutoTom = Number(tomAtual.id_produto_tom);

    const existente = carrinho.find(
        item => Number(item.id_produto_tom) === idProdutoTom
    );

    const noCarrinho = existente
        ? Number(existente.quantidade)
        : 0;

    if (noCarrinho + quantidade > estoque) {
        if (typeof mostrarAlerta === 'function') {
            mostrarAlerta(
                `Estoque insuficiente. Disponível: ${estoque} unidade(s).`
            );
        }

        return;
    }

    if (existente) {
        existente.quantidade = noCarrinho + quantidade;
    } else {
        carrinho.push({
            id: Number(produtoAtual.id_produto),
            codigo: Number(produtoAtual.id_produto),
            id_produto_tom: idProdutoTom,
            nome: produtoAtual.nome_produto,
            nome_tom: tomAtual.nome_tom,
            preco: Number(produtoAtual.preco_unitario_produto),
            quantidade,
            estoque
        });
    }

    sessionStorage.setItem(
        'carrinho',
        JSON.stringify(carrinho)
    );

    atualizarContador();

    if (typeof mostrarAlerta === 'function') {
        mostrarAlerta(
            `${produtoAtual.nome_produto} - ${tomAtual.nome_tom} adicionado ao carrinho!`
        );
    }
});

document.addEventListener('DOMContentLoaded', () => {
    atualizarContador();
    carregarProduto();
});