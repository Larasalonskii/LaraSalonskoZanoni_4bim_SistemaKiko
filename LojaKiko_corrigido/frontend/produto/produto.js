
// ============================================================
// CRUD DE PRODUTOS - LOJA DE MAQUIAGENS
// VENDA POR UNIDADE
// ============================================================

const API_BASE_URL = window.location.origin;

let currentProductId = null;
let operacao = null;

const form = document.getElementById('produtoForm');
const searchId = document.getElementById('searchId');

const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');

const produtosTableBody =
    document.getElementById('produtosTableBody');

const messageContainer =
    document.getElementById('messageContainer');

const selectColecao =
    document.getElementById('colecao_id_colecao');

const selectCategoria =
    document.getElementById('categoria_produto_id_categoria_produto');

const listaTons = document.getElementById('listaTons');
const btnAdicionarTom = document.getElementById('btnAdicionarTom');

const inputImagem = document.getElementById('imagem_produto');
const previewImagem = document.getElementById('previewImagemProduto');

// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

    btnBuscar.addEventListener('click', buscarProduto);
    btnIncluir.addEventListener('click', incluirProduto);
    btnAlterar.addEventListener('click', alterarProduto);
    btnExcluir.addEventListener('click', excluirProduto);
    btnCancelar.addEventListener('click', cancelarOperacao);
    btnSalvar.addEventListener('click', salvarOperacao);

    // Evento do botão de adicionar tom
    btnAdicionarTom.addEventListener('click', () => {
        criarLinhaTom();
    });

    // Evento de pré-visualização da imagem do produto
    inputImagem.addEventListener('change', () => {

        const arquivo = inputImagem.files[0];

        if (!arquivo) {
            previewImagem.style.display = 'none';
            previewImagem.removeAttribute('src');
            return;
        }

        if (!arquivo.type.startsWith('image/')) {
            mostrarMensagem(
                'Selecione um arquivo de imagem.',
                'warning'
            );

            inputImagem.value = '';
            previewImagem.style.display = 'none';
            return;
        }

        if (arquivo.size > 10 * 1024 * 1024) {
            mostrarMensagem(
                'A imagem deve ter no máximo 10 MB.',
                'warning'
            );

            inputImagem.value = '';
            previewImagem.style.display = 'none';
            return;
        }

        previewImagem.src = URL.createObjectURL(arquivo);
        previewImagem.style.display = 'block';
    });

    bloquearCampos(false);

    mostrarBotoes(
        true,
        true,
        false,
        false,
        false,
        true
    );

    // Aguarda as opções antes de permitir o preenchimento do formulário
    await Promise.all([
        carregarColecoes(),
        carregarCategorias(),
        carregarProdutos()
    ]);
});

// ============================================================
// MENSAGENS
// ============================================================

function mostrarMensagem(texto, tipo = 'info') {

    messageContainer.textContent = '';

    const mensagem = document.createElement('div');

    mensagem.className = `message ${tipo}`;
    mensagem.textContent = texto;

    messageContainer.appendChild(mensagem);

    setTimeout(() => {
        mensagem.remove();
    }, 3500);
}

// ============================================================
// CONTROLE DOS CAMPOS
// ============================================================

function bloquearCampos(editarDados) {

    const campos = [
        document.getElementById('nome_produto'),
        document.getElementById('quantidade_estoque_produto'),
        document.getElementById('preco_unitario_produto'),
        selectColecao,
        selectCategoria,
        inputImagem
    ];

    campos.forEach(campo => {
        if (campo) {
            campo.disabled = !editarDados;
        }
    });

    listaTons.querySelectorAll('input, button').forEach(campo => {
        campo.disabled = !editarDados;
    });

    btnAdicionarTom.disabled = !editarDados;

    searchId.disabled = false;
}

// ============================================================
// LIMPAR FORMULÁRIO
// ============================================================

function limparFormulario() {

    form.reset();

    currentProductId = null;

    previewImagem.removeAttribute('src');
    previewImagem.style.display = 'none';

    listaTons.innerHTML = '';
}

// ============================================================
// MOSTRAR BOTÕES
// ============================================================

function mostrarBotoes(
    buscar,
    incluir,
    alterar,
    excluir,
    salvar,
    cancelar
) {

    btnBuscar.style.display = buscar ? 'inline-block' : 'none';
    btnIncluir.style.display = incluir ? 'inline-block' : 'none';
    btnAlterar.style.display = alterar ? 'inline-block' : 'none';
    btnExcluir.style.display = excluir ? 'inline-block' : 'none';
    btnSalvar.style.display = salvar ? 'inline-block' : 'none';
    btnCancelar.style.display = cancelar ? 'inline-block' : 'none';
}

// ============================================================
// FORMATAÇÃO
// ============================================================

function formatarPreco(valor) {

    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

async function lerResposta(response) {

    const texto = await response.text();

    if (!texto) {
        return null;
    }

    try {
        return JSON.parse(texto);
    } catch {
        return {
            message: texto
        };
    }
}

function obterMensagemErro(dados, mensagem) {

    return dados?.error ||
        dados?.message ||
        mensagem;
}

// ============================================================
// CARREGAR COLEÇÕES
// ============================================================

async function carregarColecoes() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/colecao`
        );

        const colecoes = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                obterMensagemErro(
                    colecoes,
                    'Erro ao carregar coleções.'
                )
            );
        }

        selectColecao.innerHTML =
            '<option value="">Sem coleção</option>';

        (Array.isArray(colecoes) ? colecoes : []).forEach(colecao => {

            const option = document.createElement('option');

            option.value = colecao.id_colecao;
            option.textContent = colecao.nome_colecao;

            selectColecao.appendChild(option);
        });

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');
    }
}

// ============================================================
// CARREGAR CATEGORIAS
// ============================================================

async function carregarCategorias() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/categoria-produto`
        );

        const categorias = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                obterMensagemErro(
                    categorias,
                    'Erro ao carregar categorias.'
                )
            );
        }

        selectCategoria.innerHTML =
            '<option value="">Selecione uma categoria</option>';

        (Array.isArray(categorias) ? categorias : []).forEach(categoria => {

            const option = document.createElement('option');

            option.value = categoria.id_categoria_produto;
            option.textContent = categoria.nome_categoria_produto;

            selectCategoria.appendChild(option);
        });

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');
    }
}

// ============================================================
// CRIAR LINHA DE TOM
// ============================================================

function criarLinhaTom(tom = {}) {

    const linha = document.createElement('div');

    linha.className = 'tom-form-row';

    if (tom.id_produto_tom) {
        linha.dataset.idProdutoTom = tom.id_produto_tom;
    }

    // Nome do tom
    const nome = document.createElement('input');

    nome.type = 'text';
    nome.className = 'tom-nome';
    nome.maxLength = 40;
    nome.placeholder = 'Nome do tom (ex.: Bege Claro)';
    nome.value = tom.nome_tom || '';
    nome.required = true;

    // Estoque do tom
    const estoque = document.createElement('input');

    estoque.type = 'number';
    estoque.className = 'tom-estoque';
    estoque.min = '0';
    estoque.step = '1';
    estoque.placeholder = 'Estoque';
    estoque.value = tom.quantidade_estoque_tom ?? 0;
    estoque.required = true;

    // Foto do tom
    const foto = document.createElement('input');

    foto.type = 'file';
    foto.className = 'tom-foto';
    foto.accept = 'image/png,image/jpeg,image/webp';

    // Pré-visualização da foto
    const preview = document.createElement('img');

    preview.className = 'tom-preview';

    preview.style.cssText = `
    display: none;
    width: 90px;
    height: 90px;
    max-width: 90px;
    max-height: 90px;
    min-width: 90px;
    min-height: 90px;
    object-fit: contain;
    padding: 5px;
    box-sizing: border-box;
    border-radius: 12px;
`;
    preview.alt = 'Prévia da foto do tom';

    if (tom.id_produto_tom && tom.imagem_produto_tom) {

        preview.src =
            `${API_BASE_URL}/view-image-tom/${tom.id_produto_tom}`;

        preview.style.display = 'block';
    }

    // Evento para selecionar foto
    foto.addEventListener('change', () => {

        const arquivo = foto.files[0];

        if (!arquivo) {
            return;
        }

        if (!arquivo.type.startsWith('image/')) {

            mostrarMensagem(
                'Selecione uma imagem válida.',
                'warning'
            );

            foto.value = '';
            return;
        }

        if (arquivo.size > 10 * 1024 * 1024) {

            mostrarMensagem(
                'A imagem deve ter no máximo 10 MB.',
                'warning'
            );

            foto.value = '';
            return;
        }

        preview.src = URL.createObjectURL(arquivo);
        preview.style.display = 'block';
    });

    // Botão remover
    const remover = document.createElement('button');

    remover.type = 'button';
    remover.textContent = 'Remover tom';
    remover.className = 'btn-danger';

    remover.addEventListener('click', () => {
        linha.remove();
    });

    linha.append(
        nome,
        estoque,
        foto,
        preview,
        remover
    );

    listaTons.appendChild(linha);
}

// ============================================================
// OBTER TONS DO FORMULÁRIO
// ============================================================

function obterTonsFormulario() {

    return [...listaTons.querySelectorAll('.tom-form-row')].map(linha => ({

        id_produto_tom: linha.dataset.idProdutoTom
            ? Number(linha.dataset.idProdutoTom)
            : null,

        nome_tom: linha.querySelector('.tom-nome').value.trim(),

        quantidade_estoque_tom: Number(
            linha.querySelector('.tom-estoque').value
        )
    }));
}

// ============================================================
// PREENCHER TONS DO FORMULÁRIO
// ============================================================

function preencherTonsFormulario(tons = []) {

    listaTons.innerHTML = '';

    tons.forEach(tom => {
        criarLinhaTom(tom);
    });
}

// ============================================================
// ENVIAR FOTOS DOS TONS
// ============================================================

async function enviarFotosDosTons(produtoSalvo) {

    const linhas = [
        ...listaTons.querySelectorAll('.tom-form-row')
    ];

    if (linhas.length === 0) {
        return;
    }

    // Recupera os tons que foram salvos no banco
    const respostaProduto = await fetch(
        `${API_BASE_URL}/produto/${produtoSalvo.id_produto}`
    );

    const produtoAtualizado = await lerResposta(respostaProduto);

    if (!respostaProduto.ok) {
        throw new Error(
            obterMensagemErro(
                produtoAtualizado,
                'Não foi possível recuperar os tons salvos.'
            )
        );
    }

    const tonsSalvos = Array.isArray(produtoAtualizado.tons)
        ? [...produtoAtualizado.tons]
        : [];

    for (const linha of linhas) {

        const arquivo = linha.querySelector('.tom-foto').files[0];

        if (!arquivo) {
            continue;
        }

        const nomeTom = linha.querySelector('.tom-nome').value.trim();

        const estoqueTom = Number(
            linha.querySelector('.tom-estoque').value
        );

        // Primeiro tenta localizar pelo ID já existente
        let indice = -1;

        if (linha.dataset.idProdutoTom) {

            indice = tonsSalvos.findIndex(tom =>
                Number(tom.id_produto_tom) ===
                Number(linha.dataset.idProdutoTom)
            );

        } else {

            indice = tonsSalvos.findIndex(tom =>
                tom.nome_tom === nomeTom &&
                Number(tom.quantidade_estoque_tom) === estoqueTom
            );
        }

        if (indice === -1) {

            throw new Error(
                `Não encontrei a variação "${nomeTom}" para salvar a foto.`
            );
        }

        const variacao = tonsSalvos.splice(indice, 1)[0];

        const dados = new FormData();

        dados.append(
            'produtoTomId',
            variacao.id_produto_tom
        );

        dados.append('imageSource', 'local');
        dados.append('imageFile', arquivo);

        const resposta = await fetch(
            `${API_BASE_URL}/upload-image-tom`,
            {
                method: 'POST',
                body: dados
            }
        );

        const retorno = await lerResposta(resposta);

        if (!resposta.ok) {

            throw new Error(
                obterMensagemErro(
                    retorno,
                    `Erro ao enviar foto de ${nomeTom}.`
                )
            );
        }
    }
}

// ============================================================
// BUSCAR PRODUTO
// ============================================================

async function buscarProduto() {

    const id = searchId.value.trim();

    if (!id) {

        mostrarMensagem(
            'Digite um ID para buscar.',
            'warning'
        );

        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/produto/${encodeURIComponent(id)}`
        );

        const produto = await lerResposta(response);

        if (response.status === 404) {

            limparFormulario();

            searchId.value = id;

            bloquearCampos(true);

            mostrarBotoes(
                true,
                true,
                false,
                false,
                false,
                true
            );

            operacao = null;

            mostrarMensagem(
                'Produto não encontrado. Você pode cadastrar um novo.',
                'info'
            );

            return;
        }

        if (!response.ok) {

            throw new Error(
                obterMensagemErro(
                    produto,
                    'Erro ao buscar produto.'
                )
            );
        }

        preencherFormulario(produto);

        bloquearCampos(false);

        mostrarBotoes(
            true,
            false,
            true,
            true,
            false,
            true
        );

        operacao = null;

        mostrarMensagem(
            'Produto encontrado!',
            'success'
        );

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');
    }
}

// ============================================================
// PREENCHER FORMULÁRIO
// ============================================================

function preencherFormulario(produto) {

    currentProductId = produto.id_produto;

    searchId.value = produto.id_produto;

    document.getElementById('nome_produto').value =
        produto.nome_produto ?? '';

    document.getElementById('quantidade_estoque_produto').value =
        produto.quantidade_estoque_produto ?? 0;

    document.getElementById('preco_unitario_produto').value =
        produto.preco_unitario_produto ?? '';

    selectColecao.value =
        produto.colecao_id_colecao ?? '';

    selectCategoria.value =
        produto.categoria_produto_id_categoria_produto ?? '';

    preencherTonsFormulario(produto.tons || []);
}

// ============================================================
// INCLUIR PRODUTO
// ============================================================

function incluirProduto() {

    const idDigitado = searchId.value.trim();

    limparFormulario();

    criarLinhaTom();

    searchId.value = idDigitado;

    bloquearCampos(true);

    mostrarBotoes(
        false,
        false,
        false,
        false,
        true,
        true
    );

    operacao = 'incluir';

    document.getElementById('nome_produto').focus();

    mostrarMensagem(
        'Preencha os dados do novo produto.',
        'info'
    );
}

// ============================================================
// ALTERAR PRODUTO
// ============================================================

function alterarProduto() {

    if (!currentProductId) {

        mostrarMensagem(
            'Busque um produto primeiro.',
            'warning'
        );

        return;
    }

    bloquearCampos(true);

    mostrarBotoes(
        false,
        false,
        false,
        false,
        true,
        true
    );

    operacao = 'alterar';

    mostrarMensagem(
        'Altere os dados do produto.',
        'info'
    );
}

// ============================================================
// EXCLUIR PRODUTO
// ============================================================

async function excluirProduto() {

    if (!currentProductId) {

        mostrarMensagem(
            'Busque um produto primeiro.',
            'warning'
        );

        return;
    }

    if (!confirm(
        'Deseja arquivar este produto? Ele deixará de aparecer na loja, mas continuará no histórico dos pedidos.'
    )) {
        return;
    }

    try {

        btnExcluir.disabled = true;

        const response = await fetch(
            `${API_BASE_URL}/produto/${encodeURIComponent(currentProductId)}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );

        const dados = await lerResposta(response);

        if (!response.ok) {

            throw new Error(
                obterMensagemErro(
                    dados,
                    'Não foi possível arquivar o produto.'
                )
            );
        }

        mostrarMensagem(
            'Produto arquivado com sucesso!',
            'success'
        );

        cancelarOperacao();

        await carregarProdutos();

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');

    } finally {

        btnExcluir.disabled = false;
    }
}

// ============================================================
// ENVIAR IMAGEM DO PRODUTO
// ============================================================

async function enviarImagemProduto(produtoId) {

    const arquivo = inputImagem.files[0];

    if (!arquivo) {
        return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {

        throw new Error(
            'A imagem deve ter no máximo 10 MB.'
        );
    }

    const dadosImagem = new FormData();

    dadosImagem.append('produtoId', String(produtoId));
    dadosImagem.append('imageSource', 'local');
    dadosImagem.append('imageFile', arquivo);

    const resposta = await fetch(
        `${API_BASE_URL}/upload-image`,
        {
            method: 'POST',
            body: dadosImagem
        }
    );

    const retorno = await lerResposta(resposta);

    if (!resposta.ok) {

        throw new Error(
            obterMensagemErro(
                retorno,
                'Não foi possível salvar a foto do produto.'
            )
        );
    }
}

// ============================================================
// SALVAR PRODUTO
// ============================================================

async function salvarOperacao() {

    if (!['incluir', 'alterar'].includes(operacao)) {

        mostrarMensagem(
            'Inicie uma operação primeiro.',
            'warning'
        );

        return;
    }

    const nome =
        document.getElementById('nome_produto').value.trim();

    const estoque =
        Number(
            document.getElementById('quantidade_estoque_produto').value
        );

    const preco =
        Number(
            document.getElementById('preco_unitario_produto').value
        );

    const colecaoValor = selectColecao.value;
    const categoriaValor = selectCategoria.value;

    // Validar nome
    if (!nome) {

        mostrarMensagem(
            'Informe o nome do produto.',
            'warning'
        );

        return;
    }

    // Validar estoque
    if (!Number.isInteger(estoque) || estoque < 0) {

        mostrarMensagem(
            'O estoque deve ser um número inteiro.',
            'warning'
        );

        return;
    }

    // Validar preço
    if (!Number.isFinite(preco) || preco < 0) {

        mostrarMensagem(
            'Informe um preço válido.',
            'warning'
        );

        return;
    }

    // Validar categoria
    if (!categoriaValor) {

        mostrarMensagem(
            'Selecione a categoria do produto.',
            'warning'
        );

        return;
    }

    // Obter tons
    const tons = obterTonsFormulario();

    // Validar tons
    for (const tom of tons) {

        if (!tom.nome_tom) {

            mostrarMensagem(
                'Preencha o nome de todos os tons.',
                'warning'
            );

            return;
        }

        if (
            !Number.isInteger(tom.quantidade_estoque_tom) ||
            tom.quantidade_estoque_tom < 0
        ) {

            mostrarMensagem(
                `O estoque do tom "${tom.nome_tom}" é inválido.`,
                'warning'
            );

            return;
        }
    }

    // Montar dados do produto
    const produto = {

        nome_produto: nome,

        quantidade_estoque_produto: estoque,

        preco_unitario_produto: preco,

        // Coleção é opcional
        colecao_id_colecao: colecaoValor
            ? Number(colecaoValor)
            : null,

        // Categoria é obrigatória
        categoria_produto_id_categoria_produto:
            Number(categoriaValor),

        tons
    };

    if (operacao === 'alterar') {
        produto.id_produto = Number(currentProductId);
    }

    try {

        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Salvando...';

        const operacaoAtual = operacao;

        const url = operacaoAtual === 'incluir'
            ? `${API_BASE_URL}/produto`
            : `${API_BASE_URL}/produto/${encodeURIComponent(currentProductId)}`;

        const response = await fetch(url, {

            method: operacaoAtual === 'incluir'
                ? 'POST'
                : 'PUT',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(produto)
        });

        const dados = await lerResposta(response);

        if (!response.ok) {

            throw new Error(
                obterMensagemErro(
                    dados,
                    'Erro ao salvar produto.'
                )
            );
        }

        // Recuperar ID do produto salvo
        const idProdutoSalvo =
            dados?.id_produto ??
            dados?.produto?.id_produto ??
            currentProductId;

        if (!idProdutoSalvo) {

            throw new Error(
                'O produto foi enviado, mas não consegui recuperar seu ID para salvar as imagens.'
            );
        }

        // Enviar imagem principal
        if (inputImagem.files[0]) {
            await enviarImagemProduto(idProdutoSalvo);
        }

        // Enviar imagens dos tons
        await enviarFotosDosTons({
            id_produto: idProdutoSalvo
        });

        mostrarMensagem(
            operacaoAtual === 'incluir'
                ? 'Produto cadastrado com sucesso!'
                : 'Produto alterado com sucesso!',
            'success'
        );

        cancelarOperacao();

        await carregarProdutos();

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');

    } finally {

        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar';
    }
}

// ============================================================
// CANCELAR
// ============================================================

function cancelarOperacao() {

    limparFormulario();

    operacao = null;

    bloquearCampos(false);

    mostrarBotoes(
        true,
        true,
        false,
        false,
        false,
        true
    );

    searchId.value = '';
}

// ============================================================
// CARREGAR PRODUTOS
// ============================================================

async function carregarProdutos() {

    try {

        const response = await fetch(
            `${API_BASE_URL}/produto`
        );

        const produtos = await lerResposta(response);

        if (!response.ok) {

            throw new Error(
                obterMensagemErro(
                    produtos,
                    'Erro ao carregar produtos.'
                )
            );
        }

        renderizarTabelaProdutos(
            Array.isArray(produtos) ? produtos : []
        );

    } catch (error) {

        console.error(error);
        mostrarMensagem(error.message, 'error');
    }
}

// ============================================================
// MOSTRAR PRODUTOS NA TABELA
// ============================================================

function renderizarTabelaProdutos(produtos) {

    produtosTableBody.innerHTML = '';

    if (produtos.length === 0) {

        produtosTableBody.innerHTML = `
            <tr>
                <td colspan="6">
                    Nenhum produto cadastrado.
                </td>
            </tr>
        `;

        return;
    }

    produtos.forEach(produto => {

        const linha = document.createElement('tr');

        const valores = [

            produto.id_produto,

            produto.nome_produto,

            `${produto.quantidade_estoque_produto} unidade(s)`,

            `${formatarPreco(produto.preco_unitario_produto)} / unidade`,

            produto.nome_categoria_produto || '-',

            produto.nome_colecao || '-'
        ];

        valores.forEach((valor, indice) => {

            const coluna = document.createElement('td');

            if (indice === 0) {

                const botao = document.createElement('button');

                botao.type = 'button';
                botao.textContent = valor;

                botao.addEventListener('click', () => {
                    selecionarProduto(produto.id_produto);
                });

                coluna.appendChild(botao);

            } else {

                coluna.textContent = valor;
            }

            linha.appendChild(coluna);
        });

        produtosTableBody.appendChild(linha);
    });
}

// ============================================================
// SELECIONAR PRODUTO PELA TABELA
// ============================================================

async function selecionarProduto(id) {

    searchId.value = id;

    await buscarProduto();
}
