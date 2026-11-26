const API_BASE_URL = window.location.origin;

let tomAtualId = null;
let operacao = null;

const form = document.getElementById('tomForm');
const searchId = document.getElementById('searchId');
const nomeTom = document.getElementById('nome_tom');

const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');

const tonsTableBody = document.getElementById('tonsTableBody');
const messageContainer = document.getElementById('messageContainer');

document.addEventListener('DOMContentLoaded', carregarTons);

btnBuscar.addEventListener('click', buscarTom);
btnIncluir.addEventListener('click', incluirTom);
btnAlterar.addEventListener('click', alterarTom);
btnExcluir.addEventListener('click', excluirTom);
btnCancelar.addEventListener('click', cancelarOperacao);
btnSalvar.addEventListener('click', salvarOperacao);

mostrarBotoes(true, true, false, false, false, true);
bloquearCampos(false);

// MENSAGENS
function mostrarMensagem(texto, tipo = 'info') {
    messageContainer.textContent = '';

    const mensagem = document.createElement('div');

    mensagem.className = `message ${tipo}`;
    mensagem.textContent = texto;

    messageContainer.appendChild(mensagem);

    setTimeout(() => mensagem.remove(), 3500);
}

// CONTROLE DOS BOTÕES
function mostrarBotoes(buscar, incluir, alterar, excluir, salvar, cancelar) {
    btnBuscar.style.display = buscar ? 'inline-block' : 'none';
    btnIncluir.style.display = incluir ? 'inline-block' : 'none';
    btnAlterar.style.display = alterar ? 'inline-block' : 'none';
    btnExcluir.style.display = excluir ? 'inline-block' : 'none';
    btnSalvar.style.display = salvar ? 'inline-block' : 'none';
    btnCancelar.style.display = cancelar ? 'inline-block' : 'none';
}

// BLOQUEAR CAMPOS
function bloquearCampos(emEdicao) {
    searchId.disabled = Boolean(emEdicao);
    nomeTom.disabled = !emEdicao;
}

// LIMPAR FORMULÁRIO
function limparFormulario() {
    form.reset();

    tomAtualId = null;
    operacao = null;
}

// LER RESPOSTA DO SERVIDOR
async function lerResposta(response) {
    const texto = await response.text();

    if (!texto) return null;

    try {
        return JSON.parse(texto);
    } catch {
        return { error: texto };
    }
}

// BUSCAR TOM
async function buscarTom() {
    const id = searchId.value.trim();

    if (!id) {
        mostrarMensagem('Digite um ID para buscar.', 'warning');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/tom/${encodeURIComponent(id)}`
        );

        const tom = await lerResposta(response);

        if (response.status === 404) {
            limparFormulario();

            searchId.value = id;

            bloquearCampos(false);

            mostrarBotoes(
                true,
                true,
                false,
                false,
                false,
                true
            );

            mostrarMensagem(
                'Tom não encontrado. Você pode cadastrar um novo.',
                'info'
            );

            return;
        }

        if (!response.ok) {
            throw new Error(tom?.error || 'Erro ao buscar tom.');
        }

        preencherFormulario(tom);

        bloquearCampos(false);

        mostrarBotoes(
            true,
            false,
            true,
            true,
            false,
            true
        );

        mostrarMensagem('Tom encontrado!', 'success');

    } catch (error) {
        console.error(error);

        mostrarMensagem(
            error.message || 'Erro ao buscar tom.',
            'error'
        );
    }
}

// PREENCHER FORMULÁRIO
function preencherFormulario(tom) {
    tomAtualId = tom.id_tom;

    searchId.value = tom.id_tom;
    nomeTom.value = tom.nome_tom || '';
}

// INCLUIR TOM
function incluirTom() {
    limparFormulario();

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

    nomeTom.focus();

    mostrarMensagem(
        'Digite o nome do novo tom.',
        'info'
    );
}

// ALTERAR TOM
function alterarTom() {
    if (!tomAtualId) return;

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

    nomeTom.focus();

    mostrarMensagem(
        'Altere o nome do tom.',
        'info'
    );
}

// EXCLUIR TOM
async function excluirTom() {
    if (!tomAtualId) return;

    if (!confirm('Deseja realmente excluir este tom?')) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/tom/${tomAtualId}`,
            {
                method: 'DELETE'
            }
        );

        const dados = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                dados?.error || 'Não foi possível excluir o tom.'
            );
        }

        mostrarMensagem(
            'Tom excluído com sucesso!',
            'success'
        );

        cancelarOperacao(false);

        await carregarTons();

    } catch (error) {
        console.error(error);

        mostrarMensagem(error.message, 'error');
    }
}

// SALVAR OPERAÇÃO
async function salvarOperacao() {
    const nome = nomeTom.value.trim();

    if (!nome) {
        mostrarMensagem(
            'Informe o nome do tom.',
            'warning'
        );

        nomeTom.focus();

        return;
    }

    if (nome.length > 40) {
        mostrarMensagem(
            'O nome pode ter no máximo 40 caracteres.',
            'warning'
        );

        return;
    }

    const url = operacao === 'incluir'
        ? `${API_BASE_URL}/tom`
        : `${API_BASE_URL}/tom/${tomAtualId}`;

    try {
        btnSalvar.disabled = true;

        const response = await fetch(url, {
            method: operacao === 'incluir' ? 'POST' : 'PUT',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                nome_tom: nome
            })
        });

        const dados = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                dados?.error || 'Erro ao salvar tom.'
            );
        }

        mostrarMensagem(
            operacao === 'incluir'
                ? 'Tom cadastrado com sucesso!'
                : 'Tom alterado com sucesso!',
            'success'
        );

        cancelarOperacao(false);

        await carregarTons();

    } catch (error) {
        console.error(error);

        mostrarMensagem(error.message, 'error');

    } finally {
        btnSalvar.disabled = false;
    }
}

// CANCELAR OPERAÇÃO
function cancelarOperacao(mostrarAviso = true) {
    limparFormulario();

    searchId.disabled = false;
    nomeTom.disabled = true;

    mostrarBotoes(
        true,
        true,
        false,
        false,
        false,
        true
    );

    if (mostrarAviso) {
        mostrarMensagem(
            'Operação cancelada.',
            'info'
        );
    }
}

// CARREGAR TONS
async function carregarTons() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/tom`
        );

        const tons = await lerResposta(response);

        if (!response.ok) {
            throw new Error(
                tons?.error || 'Erro ao carregar tons.'
            );
        }

        renderizarTabelaTons(tons || []);

    } catch (error) {
        console.error(error);

        mostrarMensagem(
            error.message || 'Erro ao carregar lista de tons.',
            'error'
        );
    }
}

// RENDERIZAR TABELA
function renderizarTabelaTons(tons) {
    tonsTableBody.innerHTML = '';

    if (!tons.length) {
        tonsTableBody.innerHTML = `
            <tr>
                <td colspan="2">Nenhum tom cadastrado.</td>
            </tr>
        `;

        return;
    }

    tons.forEach(tom => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        const nomeCell = document.createElement('td');

        const botao = document.createElement('button');

        botao.type = 'button';
        botao.className = 'btn-id';
        botao.textContent = tom.id_tom;

        botao.addEventListener('click', () => {
            searchId.value = tom.id_tom;
            buscarTom();
        });

        idCell.appendChild(botao);

        nomeCell.textContent = tom.nome_tom;

        row.append(idCell, nomeCell);

        tonsTableBody.appendChild(row);
    });
}