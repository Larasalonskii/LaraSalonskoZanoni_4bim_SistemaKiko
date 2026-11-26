
// Configuração da API
const API_BASE_URL = window.location.origin;

let currentCategoryId = null;
let operacao = null;

// Elementos do DOM
const form = document.getElementById('categoriaForm');
const searchId = document.getElementById('searchId');

const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');

const categoriasTableBody = document.getElementById('categoriasTableBody');
const messageContainer = document.getElementById('messageContainer');

// Eventos dos botões
btnBuscar.addEventListener('click', buscarCategoria);
btnIncluir.addEventListener('click', incluirCategoria);
btnAlterar.addEventListener('click', alterarCategoria);
btnExcluir.addEventListener('click', excluirCategoria);
btnCancelar.addEventListener('click', cancelarOperacao);
btnSalvar.addEventListener('click', salvarOperacao);

// Carregar categorias ao abrir a página
document.addEventListener('DOMContentLoaded', () => {
    carregarCategorias();
});

// Estado inicial
mostrarBotoes(true, false, false, false, false, true);
bloquearCampos(false);

// Mostrar mensagens
function mostrarMensagem(texto, tipo = 'info') {
    messageContainer.innerHTML = '';

    const mensagem = document.createElement('div');
    mensagem.className = `message ${tipo}`;
    mensagem.textContent = texto;

    messageContainer.appendChild(mensagem);

    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 3000);
}

// Bloquear ou liberar campos
function bloquearCampos(bloquearPrimeiro) {
    const inputs = form.querySelectorAll('input, select');

    inputs.forEach((input, index) => {
        if (index === 0) {
            input.disabled = bloquearPrimeiro;
        } else {
            input.disabled = !bloquearPrimeiro;
        }
    });
}

// Limpar formulário
function limparFormulario() {
    form.reset();
}

// Mostrar botões
function mostrarBotoes(
    btBuscar,
    btIncluir,
    btAlterar,
    btExcluir,
    btSalvar,
    btCancelar
) {
    btnBuscar.style.display = btBuscar ? 'inline-block' : 'none';
    btnIncluir.style.display = btIncluir ? 'inline-block' : 'none';
    btnAlterar.style.display = btAlterar ? 'inline-block' : 'none';
    btnExcluir.style.display = btExcluir ? 'inline-block' : 'none';
    btnSalvar.style.display = btSalvar ? 'inline-block' : 'none';
    btnCancelar.style.display = btCancelar ? 'inline-block' : 'none';
}

// Buscar categoria pelo ID
async function buscarCategoria() {
    const id = searchId.value.trim();

    if (!id || Number(id) <= 0) {
        mostrarMensagem('Digite um ID válido para buscar.', 'warning');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/categoria-produto/${id}`
        );

        if (response.ok) {
            const categoria = await response.json();

            preencherFormulario(categoria);

            bloquearCampos(false);
            mostrarBotoes(true, false, true, true, false, true);

            mostrarMensagem('Categoria encontrada!', 'success');

        } else if (response.status === 404) {
            limparFormulario();
            searchId.value = id;

            bloquearCampos(false);
            mostrarBotoes(true, true, false, false, false, true);

            mostrarMensagem(
                'Categoria não encontrada. Você pode incluir uma nova.',
                'info'
            );

        } else {
            const erro = await response.json();
            throw new Error(erro.error || 'Erro ao buscar categoria.');
        }

    } catch (error) {
        console.error('Erro ao buscar categoria:', error);
        mostrarMensagem(
            error.message || 'Erro ao buscar categoria.',
            'error'
        );
    }
}

// Preencher formulário
function preencherFormulario(categoria) {
    currentCategoryId = categoria.id_categoria_produto;

    searchId.value = categoria.id_categoria_produto;

    document.getElementById('nome_categoria_produto').value =
        categoria.nome_categoria_produto || '';
}

// Incluir categoria
function incluirCategoria() {
    currentCategoryId = searchId.value;

    limparFormulario();
    searchId.value = currentCategoryId;

    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true);

    document.getElementById('nome_categoria_produto').focus();

    operacao = 'incluir';

    mostrarMensagem(
        'Digite os dados da nova categoria.',
        'info'
    );
}

// Alterar categoria
function alterarCategoria() {
    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true);

    document.getElementById('nome_categoria_produto').focus();

    operacao = 'alterar';

    mostrarMensagem(
        'Altere os dados da categoria.',
        'info'
    );
}

// Excluir categoria
function excluirCategoria() {
    currentCategoryId = searchId.value;

    searchId.disabled = true;

    bloquearCampos(false);

    mostrarBotoes(false, false, false, false, true, true);

    operacao = 'excluir';

    mostrarMensagem(
        'Clique em Salvar para confirmar a exclusão da categoria.',
        'warning'
    );
}

// Salvar operação
async function salvarOperacao() {
    const formData = new FormData(form);

    const categoria = {
        nome_categoria_produto: formData.get('nome_categoria_produto')
            ? formData.get('nome_categoria_produto').trim()
            : ''
    };

    let response;

    try {
        if (
            operacao === 'incluir' ||
            operacao === 'alterar'
        ) {
            if (!categoria.nome_categoria_produto) {
                mostrarMensagem(
                    'Informe o nome da categoria.',
                    'warning'
                );
                return;
            }
        }

        if (operacao === 'incluir') {
            response = await fetch(
                `${API_BASE_URL}/categoria-produto`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(categoria)
                }
            );

        } else if (operacao === 'alterar') {
            response = await fetch(
                `${API_BASE_URL}/categoria-produto/${currentCategoryId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(categoria)
                }
            );

        } else if (operacao === 'excluir') {
            response = await fetch(
                `${API_BASE_URL}/categoria-produto/${currentCategoryId}`,
                {
                    method: 'DELETE'
                }
            );
        }

        if (!response) {
            throw new Error('Nenhuma operação foi selecionada.');
        }

        const resultado = await response.json().catch(() => ({}));

        if (response.ok) {
            const operacaoConcluida = operacao;

            if (operacaoConcluida === 'incluir') {
                mostrarMensagem(
                    'Categoria cadastrada com sucesso!',
                    'success'
                );

            } else if (operacaoConcluida === 'alterar') {
                mostrarMensagem(
                    'Categoria alterada com sucesso!',
                    'success'
                );

            } else if (operacaoConcluida === 'excluir') {
                mostrarMensagem(
                    'Categoria excluída com sucesso!',
                    'success'
                );
            }

            limparFormulario();

            currentCategoryId = null;
            operacao = null;

            // Atualizar tabela após operação
            await carregarCategorias();

        } else {
            mostrarMensagem(
                resultado.error ||
                'Não foi possível realizar a operação.',
                'error'
            );
        }

    } catch (error) {
        console.error('Erro ao salvar categoria:', error);

        mostrarMensagem(
            error.message ||
            'Erro ao incluir, alterar ou excluir categoria.',
            'error'
        );

    } finally {
        searchId.disabled = false;

        mostrarBotoes(true, false, false, false, false, true);
        bloquearCampos(false);

        searchId.focus();
    }
}

// Cancelar operação
function cancelarOperacao() {
    limparFormulario();

    currentCategoryId = null;
    operacao = null;

    searchId.disabled = false;

    mostrarBotoes(true, false, false, false, false, true);
    bloquearCampos(false);

    searchId.focus();

    mostrarMensagem('Operação cancelada.', 'info');
}

// Carregar categorias da API
async function carregarCategorias() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/categoria-produto`
        );

        if (!response.ok) {
            throw new Error('Erro ao carregar categorias.');
        }

        const categorias = await response.json();

        renderizarTabelaCategorias(categorias);

    } catch (error) {
        console.error('Erro ao carregar categorias:', error);

        mostrarMensagem(
            'Erro ao carregar lista de categorias.',
            'error'
        );
    }
}

// Renderizar tabela de categorias
function renderizarTabelaCategorias(categorias) {
    categoriasTableBody.innerHTML = '';

    if (!categorias || categorias.length === 0) {
        const linha = document.createElement('tr');
        const celula = document.createElement('td');

        celula.colSpan = 2;
        celula.textContent = 'Nenhuma categoria cadastrada.';
        celula.style.textAlign = 'center';

        linha.appendChild(celula);
        categoriasTableBody.appendChild(linha);

        return;
    }

    categorias.forEach(categoria => {
        const linha = document.createElement('tr');

        // Coluna ID
        const celulaId = document.createElement('td');
        const botaoId = document.createElement('button');

        botaoId.type = 'button';
        botaoId.className = 'btn-id';
        botaoId.textContent = categoria.id_categoria_produto;

        botaoId.addEventListener('click', () => {
            searchId.value = categoria.id_categoria_produto;
            buscarCategoria();
        });

        celulaId.appendChild(botaoId);

        // Coluna nome
        const celulaNome = document.createElement('td');
        celulaNome.textContent = categoria.nome_categoria_produto;

        linha.appendChild(celulaId);
        linha.appendChild(celulaNome);

        categoriasTableBody.appendChild(linha);
    });
}
