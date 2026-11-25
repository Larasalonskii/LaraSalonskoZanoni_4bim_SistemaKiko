
// URL base do backend (o frontend também pode ser aberto por Live Server, em outra porta)
const API_BASE_URL = window.location.origin;
const API_PEDIDO = `${API_BASE_URL}/pedido`;
const CHAVE_RASCUNHO_PEDIDO = 'candyshop_pedido_rascunho';

const $ = (id) => document.getElementById(id);

const campoBusca = $('searchId');
const campoId = $('id_pedido');
const campoData = $('data_pedido');
const campoCliente = $('cliente_pessoa_cpf_pessoa');
const campoFuncionario = $('funcionario_pessoa_cpf_pessoa');
const spanTotal = $('totalPedido');
const spanPago = $('infoPago');

const btnBuscar = $('btnBuscar');
const btnIncluir = $('btnIncluir');
const btnAlterar = $('btnAlterar');
const btnExcluir = $('btnExcluir');
const btnSalvar = $('btnSalvar');
const btnCancelar = $('btnCancelar');
const btnAdicionarItem = $('btnAdicionarItem');

const itensCorpo = $('itensTableBody');
const tabelaCorpo = $('pedidosTableBody');
const containerMensagem = $('messageContainer');

const formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
});

// Opções dos selects (carregadas de GET /pedido/opcoes)
let produtosTom = [];

// Modos da tela: inicial | consultado | incluindo | alterando
let modo = 'inicial';

// ---------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------
function mostrarMensagem(texto, tipo = 'success') {
    const div = document.createElement('div');
    div.className = `message ${tipo}`;
    div.textContent = texto;
    containerMensagem.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

async function requisicao(url, opcoes = {}) {
    const config = {
        credentials: 'include',
        ...opcoes
    };

    if (opcoes.body) {
        config.headers = {
            'Content-Type': 'application/json',
            ...(opcoes.headers || {})
        };
    }

    const resposta = await fetch(url, config);

    if (resposta.status === 204) return null;

    const corpo = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(corpo.error || 'Erro na requisição');
    }

    return corpo;
}

function formatarMoeda(valor) {
    if (valor === null || valor === undefined) return '—';
    return formatadorMoeda.format(valor);
}

// Converte AAAA-MM-DD em DD/MM/AAAA sem passar por Date
function formatarData(iso) {
    if (!iso) return '—';

    const [ano, mes, dia] = iso.split('-');

    return `${dia}/${mes}/${ano}`;
}

function dataDeHoje() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');

    return `${d.getFullYear()}-${mes}-${dia}`;
}

function exibir(elemento, visivel) {
    elemento.style.display = visivel ? '' : 'none';
}

function preencherSelect(select, textoInicial, opcoes) {
    select.replaceChildren();

    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = textoInicial;

    select.appendChild(inicial);

    opcoes.forEach(({ valor, texto }) => {
        const opcao = document.createElement('option');
        opcao.value = valor;
        opcao.textContent = texto;

        select.appendChild(opcao);
    });
}

// ---------------------------------------------------------------
// RASCUNHO AUTOMÁTICO
// Mantém o pedido em edição mesmo depois de atualizar a página
// ---------------------------------------------------------------
function salvarRascunho() {
    if (modo !== 'incluindo' && modo !== 'alterando') return;

    const rascunho = {
        modo,
        id_pedido: campoId.value,
        data_pedido: campoData.value,
        cliente: campoCliente.value,
        funcionario: campoFuncionario.value,

        itens: Array.from(itensCorpo.querySelectorAll('tr')).map((tr) => ({
            produto_tom_id:
                tr.querySelector('.item-produto')?.value || '',

            quantidade:
                tr.querySelector('.item-quantidade')?.value || '1',

            preco_unitario:
                tr.dataset.preco ?? '',

            originalId:
                tr.dataset.originalId ?? '',

            originalPreco:
                tr.dataset.originalPreco ?? ''
        }))
    };

    try {
        localStorage.setItem(
            CHAVE_RASCUNHO_PEDIDO,
            JSON.stringify(rascunho)
        );
    } catch (erro) {
        console.warn(
            'Não foi possível guardar o rascunho do pedido:',
            erro
        );
    }
}

function apagarRascunho() {
    try {
        localStorage.removeItem(CHAVE_RASCUNHO_PEDIDO);
    } catch (erro) {
        console.warn(
            'Não foi possível apagar o rascunho do pedido:',
            erro
        );
    }
}

function restaurarRascunho() {
    let rascunho;

    try {
        rascunho = JSON.parse(
            localStorage.getItem(CHAVE_RASCUNHO_PEDIDO) || 'null'
        );
    } catch (erro) {
        apagarRascunho();
        return;
    }

    if (
        !rascunho ||
        !['incluindo', 'alterando'].includes(rascunho.modo)
    ) {
        return;
    }

    campoId.value = rascunho.id_pedido || '';
    campoData.value = rascunho.data_pedido || '';
    campoCliente.value = rascunho.cliente || '';
    campoFuncionario.value = rascunho.funcionario || '';

    definirModo(rascunho.modo);

    itensCorpo.replaceChildren();

    (rascunho.itens || []).forEach((item) => {
        const linha = criarLinhaItem({
            produto_tom_id: item.produto_tom_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario
        });

        linha.dataset.originalId = item.originalId || '';
        linha.dataset.originalPreco = item.originalPreco || '';
        linha.dataset.preco = item.preco_unitario || '';

        itensCorpo.appendChild(linha);
    });

    aplicarEstadoLinhas();
    atualizarTotal();

    mostrarMensagem(
        'Rascunho recuperado! Seus produtos continuam aqui. ❤️'
    );
}

// ---------------------------------------------------------------
// Linhas de itens do pedido
// ---------------------------------------------------------------
function precoAtualDoProdutoTom(id) {
    const produto = produtosTom.find(
        (p) => String(p.id_produto_tom) === String(id)
    );

    return produto ? produto.preco_unitario_produto : null;
}

function rotuloProdutoTom(p) {
    return `${p.nome_produto} - ${p.nome_tom} (${formatarMoeda(p.preco_unitario_produto)})`;
}

function criarLinhaItem(item = {}) {
    const tr = document.createElement('tr');

    // Guarda o item original da linha
    tr.dataset.originalId = item.produto_tom_id ?? '';
    tr.dataset.originalPreco = item.preco_unitario ?? '';
    tr.dataset.preco = item.preco_unitario ?? '';

    // Produto / tom
    const tdProduto = document.createElement('td');

    const select = document.createElement('select');
    select.className = 'item-produto';

    const inicial = document.createElement('option');
    inicial.value = '';
    inicial.textContent = 'Selecione';

    select.appendChild(inicial);

    produtosTom.forEach((p) => {
        const opcao = document.createElement('option');

        opcao.value = p.id_produto_tom;
        opcao.textContent = rotuloProdutoTom(p);

        select.appendChild(opcao);
    });

    // Mantém produtos antigos que não aparecem mais nas opções
    if (
        item.produto_tom_id &&
        !produtosTom.some(
            (p) =>
                String(p.id_produto_tom) ===
                String(item.produto_tom_id)
        )
    ) {
        const opcao = document.createElement('option');

        opcao.value = item.produto_tom_id;
        opcao.textContent =
            `${item.nome_produto} - ${item.nome_tom}`;

        select.appendChild(opcao);
    }

    select.value = item.produto_tom_id ?? '';

    tdProduto.appendChild(select);

    // Quantidade
    const tdQtd = document.createElement('td');

    const inputQtd = document.createElement('input');

    inputQtd.type = 'number';
    inputQtd.className = 'item-quantidade';
    inputQtd.min = '1';
    inputQtd.step = '1';
    inputQtd.value = item.quantidade ?? 1;

    tdQtd.appendChild(inputQtd);

    // Preço unitário e subtotal
    const tdPreco = document.createElement('td');
    tdPreco.className = 'item-preco';

    const tdSubtotal = document.createElement('td');
    tdSubtotal.className = 'item-subtotal';

    // Remover item
    const tdRemover = document.createElement('td');

    const btnRemover = document.createElement('button');

    btnRemover.type = 'button';
    btnRemover.textContent = '✖';
    btnRemover.title = 'Remover item';

    btnRemover.addEventListener('click', () => {
        tr.remove();
        atualizarTotal();
        salvarRascunho();
    });

    tdRemover.appendChild(btnRemover);

    // Quando trocar o produto/tom
    select.addEventListener('change', () => {
        if (
            select.value !== '' &&
            select.value === tr.dataset.originalId
        ) {
            tr.dataset.preco = tr.dataset.originalPreco;
        } else {
            const atual = precoAtualDoProdutoTom(select.value);
            tr.dataset.preco = atual ?? '';
        }

        atualizarTotal();
        salvarRascunho();
    });

    // Quando trocar a quantidade
    inputQtd.addEventListener('input', () => {
        atualizarTotal();
        salvarRascunho();
    });

    tr.append(
        tdProduto,
        tdQtd,
        tdPreco,
        tdSubtotal,
        tdRemover
    );

    return tr;
}

function adicionarLinhaItem(item = {}) {
    const tr = criarLinhaItem(item);

    itensCorpo.appendChild(tr);

    aplicarEstadoLinhas();
    atualizarTotal();
    salvarRascunho();
}

function lerItensDoFormulario() {
    return Array.from(itensCorpo.querySelectorAll('tr')).map((tr) => ({
        produto_tom_id:
            tr.querySelector('.item-produto').value,

        quantidade:
            tr.querySelector('.item-quantidade').value
    }));
}

// ---------------------------------------------------------------
// Cálculo do total
// ---------------------------------------------------------------
function atualizarTotal() {
    let total = 0;

    itensCorpo.querySelectorAll('tr').forEach((tr) => {
        const preco =
            tr.dataset.preco === ''
                ? null
                : Number(tr.dataset.preco);

        const quantidade = Number(
            tr.querySelector('.item-quantidade').value
        );

        const subtotal =
            preco !== null && Number.isFinite(quantidade)
                ? preco * quantidade
                : null;

        tr.querySelector('.item-preco').textContent =
            formatarMoeda(preco);

        tr.querySelector('.item-subtotal').textContent =
            formatarMoeda(subtotal);

        if (subtotal !== null) {
            total += subtotal;
        }
    });

    spanTotal.textContent = formatarMoeda(total);
}

// ---------------------------------------------------------------
// Estado das linhas
// ---------------------------------------------------------------
function aplicarEstadoLinhas() {
    const editando =
        modo === 'incluindo' || modo === 'alterando';

    itensCorpo.querySelectorAll('select, input, button').forEach((el) => {
        el.disabled = !editando;
    });
}

// ---------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------
function limparFormulario() {
    campoId.value = '';
    campoData.value = '';
    campoCliente.value = '';
    campoFuncionario.value = '';

    itensCorpo.replaceChildren();

    spanPago.textContent = '';

    atualizarTotal();
}

function preencherFormulario(pedido) {
    campoId.value = pedido.id_pedido;
    campoData.value = pedido.data_pedido || '';

    campoCliente.value =
        pedido.cliente_pessoa_cpf_pessoa ?? '';

    campoFuncionario.value =
        pedido.funcionario_pessoa_cpf_pessoa ?? '';

    itensCorpo.replaceChildren();

    (pedido.itens || []).forEach((item) => {
        itensCorpo.appendChild(criarLinhaItem(item));
    });

    aplicarEstadoLinhas();
    atualizarTotal();

    spanPago.textContent =
        ` | Pago: ${formatarMoeda(pedido.valor_pago)}`;
}

// ---------------------------------------------------------------
// Estado da tela
// ---------------------------------------------------------------
function definirModo(novoModo) {
    modo = novoModo;

    const editando =
        modo === 'incluindo' || modo === 'alterando';

    campoId.disabled = true;
    campoData.disabled = !editando;
    campoCliente.disabled = !editando;
    campoFuncionario.disabled = !editando;

    campoBusca.disabled = editando;
    btnBuscar.disabled = editando;

    exibir(btnIncluir, modo === 'inicial');
    exibir(btnAlterar, modo === 'consultado');
    exibir(btnExcluir, modo === 'consultado');
    exibir(btnSalvar, editando);
    exibir(btnAdicionarItem, editando);
    exibir(btnCancelar, true);

    aplicarEstadoLinhas();
}

// ---------------------------------------------------------------
// Carregar opções
// ---------------------------------------------------------------
async function carregarOpcoes() {
    try {
        const opcoes = await requisicao(`${API_PEDIDO}/opcoes`);

        produtosTom = opcoes.produtos_tom;

        preencherSelect(
            campoCliente,
            'Selecione um cliente',
            opcoes.clientes.map((c) => ({
                valor: c.pessoa_cpf_pessoa,
                texto: `${c.nome_pessoa} (${c.pessoa_cpf_pessoa})`
            }))
        );

        preencherSelect(
            campoFuncionario,
            'Selecione um funcionário',
            opcoes.funcionarios.map((f) => ({
                valor: f.pessoa_cpf_pessoa,
                texto: `${f.nome_pessoa} (${f.pessoa_cpf_pessoa})`
            }))
        );

    } catch (erro) {
        mostrarMensagem(
            `Não foi possível carregar as opções do pedido: ${erro.message}`,
            'error'
        );
    }
}

// ---------------------------------------------------------------
// Listar pedidos
// ---------------------------------------------------------------
async function carregarPedidos() {
    try {
        const pedidos = await requisicao(API_PEDIDO);

        tabelaCorpo.replaceChildren();

        if (pedidos.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');

            td.colSpan = 9;
            td.textContent = 'Nenhum pedido cadastrado';

            tr.appendChild(td);
            tabelaCorpo.appendChild(tr);

            return;
        }

        pedidos.forEach((pedido) => {
            const tr = document.createElement('tr');

            tr.classList.add(
                pedido.entregue
                    ? 'pedido-entregue'
                    : 'pedido-pendente'
            );

            tr.style.cursor = 'pointer';

            const valores = [
                pedido.id_pedido,
                formatarData(pedido.data_pedido),
                pedido.nome_cliente,
                pedido.nome_funcionario,
                (pedido.itens || []).length,
                formatarMoeda(pedido.valor_total),
                formatarMoeda(pedido.valor_pago)
            ];

            valores.forEach((valor) => {
                const td = document.createElement('td');
                td.textContent = valor ?? '—';

                tr.appendChild(td);
            });

            // Formas de pagamento
            const tdForma = document.createElement('td');

            const formas = pedido.formas_pagamento || [];

            tdForma.textContent = formas.length
                ? formas.map((forma) =>
                    `${forma.nome_forma_pagamento} (${formatarMoeda(forma.valor_pago)})`
                ).join(', ')
                : 'Não informado';

            tr.appendChild(tdForma);

            // Status de entrega
            const tdEntrega = document.createElement('td');

            const label = document.createElement('label');
            const checkbox = document.createElement('input');

            checkbox.type = 'checkbox';
            checkbox.checked = Boolean(pedido.entregue);
            checkbox.title = 'Marcar pedido como entregue';

            checkbox.addEventListener('click', (evento) => {
                evento.stopPropagation();
            });

            checkbox.addEventListener('change', async (evento) => {
                evento.stopPropagation();

                const novoEstado = checkbox.checked;

                checkbox.disabled = true;

                try {
                    await requisicao(
                        `${API_PEDIDO}/${pedido.id_pedido}/entrega`,
                        {
                            method: 'PATCH',
                            body: JSON.stringify({
                                entregue: novoEstado
                            })
                        }
                    );

                    pedido.entregue = novoEstado;

                    tr.classList.toggle(
                        'pedido-entregue',
                        novoEstado
                    );

                    tr.classList.toggle(
                        'pedido-pendente',
                        !novoEstado
                    );

                    label.lastChild.textContent =
                        novoEstado ? ' Entregue' : ' Pendente';

                    mostrarMensagem(
                        novoEstado
                            ? 'Pedido marcado como entregue! ❤️'
                            : 'Pedido marcado como pendente.',
                        'success'
                    );

                } catch (erro) {
                    checkbox.checked = !novoEstado;

                    mostrarMensagem(erro.message, 'error');

                } finally {
                    checkbox.disabled = false;
                }
            });

            label.appendChild(checkbox);

            label.appendChild(
                document.createTextNode(
                    pedido.entregue
                        ? ' Entregue'
                        : ' Pendente'
                )
            );

            tdEntrega.appendChild(label);
            tr.appendChild(tdEntrega);

            tr.addEventListener('click', () => {
                buscarPedido(pedido.id_pedido);
            });

            tabelaCorpo.appendChild(tr);
        });

    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

// ---------------------------------------------------------------
// Buscar pedido
// ---------------------------------------------------------------
async function buscarPedido(idInformado) {
    const id = parseInt(
        idInformado ?? campoBusca.value,
        10
    );

    if (isNaN(id)) {
        mostrarMensagem(
            'Informe um ID válido para buscar',
            'error'
        );
        return;
    }

    try {
        const pedido = await requisicao(`${API_PEDIDO}/${id}`);

        definirModo('consultado');
        preencherFormulario(pedido);

        campoBusca.value = pedido.id_pedido;

    } catch (erro) {
        limparFormulario();
        definirModo('inicial');

        mostrarMensagem(erro.message, 'error');
    }
}

// ---------------------------------------------------------------
// Incluir pedido
// ---------------------------------------------------------------
function iniciarInclusao() {
    apagarRascunho();

    limparFormulario();

    campoBusca.value = '';
    campoData.value = dataDeHoje();

    definirModo('incluindo');

    adicionarLinhaItem();

    campoCliente.focus();
}

// ---------------------------------------------------------------
// Alterar pedido
// ---------------------------------------------------------------
function iniciarAlteracao() {
    definirModo('alterando');

    salvarRascunho();

    campoData.focus();
}

// ---------------------------------------------------------------
// Salvar pedido
// ---------------------------------------------------------------
async function salvar() {
    if (campoCliente.value === '') {
        mostrarMensagem('Selecione o cliente', 'error');
        campoCliente.focus();
        return;
    }

    if (campoFuncionario.value === '') {
        mostrarMensagem('Selecione o funcionário', 'error');
        campoFuncionario.focus();
        return;
    }

    const itens = lerItensDoFormulario();

    if (itens.length === 0) {
        mostrarMensagem(
            'Adicione ao menos um item ao pedido',
            'error'
        );
        return;
    }

    const usados = new Set();

    for (const item of itens) {
        if (item.produto_tom_id === '') {
            mostrarMensagem(
                'Selecione o produto em todas as linhas',
                'error'
            );
            return;
        }

        if (
            !Number.isInteger(Number(item.quantidade)) ||
            Number(item.quantidade) <= 0
        ) {
            mostrarMensagem(
                'A quantidade deve ser um número inteiro maior que zero',
                'error'
            );
            return;
        }

        if (usados.has(item.produto_tom_id)) {
            mostrarMensagem(
                'O mesmo produto/tom não pode se repetir no pedido',
                'error'
            );
            return;
        }

        usados.add(item.produto_tom_id);
    }

    // O preço unitário NÃO é enviado:
    // o servidor usa o preço do produto
    const corpo = {
        data_pedido: campoData.value || null,

        cliente_pessoa_cpf_pessoa:
            campoCliente.value,

        funcionario_pessoa_cpf_pessoa:
            campoFuncionario.value,

        itens: itens.map((i) => ({
            produto_tom_id: Number(i.produto_tom_id),
            quantidade: Number(i.quantidade)
        }))
    };

    try {
        if (modo === 'incluindo') {
            await requisicao(API_PEDIDO, {
                method: 'POST',
                body: JSON.stringify(corpo)
            });

            mostrarMensagem('Pedido incluído com sucesso!');

        } else if (modo === 'alterando') {
            await requisicao(
                `${API_PEDIDO}/${campoId.value}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(corpo)
                }
            );

            mostrarMensagem('Pedido alterado com sucesso!');

        } else {
            return;
        }

        cancelar();
        carregarPedidos();

    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

// ---------------------------------------------------------------
// Excluir pedido
// ---------------------------------------------------------------
async function excluir() {
    const id = campoId.value;

    if (!id) return;

    if (
        !confirm(
            `Excluir o pedido ${id} (${spanTotal.textContent}) e seus itens?`
        )
    ) {
        return;
    }

    try {
        await requisicao(
            `${API_PEDIDO}/${id}`,
            { method: 'DELETE' }
        );

        mostrarMensagem('Pedido excluído com sucesso!');

        cancelar();
        carregarPedidos();

    } catch (erro) {
        mostrarMensagem(erro.message, 'error');
    }
}

// ---------------------------------------------------------------
// Cancelar
// ---------------------------------------------------------------
function cancelar() {
    apagarRascunho();

    limparFormulario();

    campoBusca.value = '';

    definirModo('inicial');
}

// ---------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------
btnBuscar.addEventListener('click', () => buscarPedido());

btnIncluir.addEventListener('click', iniciarInclusao);

btnAlterar.addEventListener('click', iniciarAlteracao);

btnExcluir.addEventListener('click', excluir);

btnSalvar.addEventListener('click', salvar);

btnCancelar.addEventListener('click', cancelar);

btnAdicionarItem.addEventListener(
    'click',
    () => adicionarLinhaItem()
);

// Salva automaticamente as alterações dos dados do pedido
[campoData, campoCliente, campoFuncionario].forEach((campo) => {
    campo.addEventListener('input', salvarRascunho);
    campo.addEventListener('change', salvarRascunho);
});

// Última garantia antes de sair/atualizar a página
window.addEventListener('beforeunload', salvarRascunho);

campoBusca.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
        evento.preventDefault();
        buscarPedido();
    }
});

// ---------------------------------------------------------------
// Início
// ---------------------------------------------------------------
(async () => {
    definirModo('inicial');

    await carregarOpcoes();

    restaurarRascunho();

    carregarPedidos();
})();
