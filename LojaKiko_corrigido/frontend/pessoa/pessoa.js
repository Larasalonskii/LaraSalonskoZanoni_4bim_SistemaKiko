// ==========================================
// CONFIGURAÇÃO
// ==========================================

const API_BASE_URL = window.location.origin;

let currentPersonId = null;
let operacao = null;
let pessoaEditavel = false;

// Elementos do DOM
const form = document.getElementById('pessoaForm');
const searchId = document.getElementById('searchId');
const btnBuscar = document.getElementById('btnBuscar');
const btnIncluir = document.getElementById('btnIncluir');
const btnAlterar = document.getElementById('btnAlterar');
const btnExcluir = document.getElementById('btnExcluir');
const btnCancelar = document.getElementById('btnCancelar');
const btnSalvar = document.getElementById('btnSalvar');
const pessoasTableBody = document.getElementById('pessoasTableBody');
const messageContainer = document.getElementById('messageContainer');

const checkboxFuncionario = document.getElementById('checkboxFuncionario');
const cargo = document.getElementById('cargo_id_cargo');
const salario = document.getElementById('salario_funcionario');

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    carregarPessoas();
    carregarCargos();
    configurarFuncionario();
});

btnBuscar.addEventListener('click', buscarPessoa);
btnIncluir.addEventListener('click', incluirPessoa);
btnAlterar.addEventListener('click', alterarPessoa);
btnExcluir.addEventListener('click', excluirPessoa);
btnCancelar.addEventListener('click', cancelarOperacao);
btnSalvar.addEventListener('click', salvarOperacao);

checkboxFuncionario.addEventListener('change', configurarFuncionario);

mostrarBotoes(true, false, false, false, false, false);
bloquearCampos(false);

// ==========================================
// MENSAGENS
// ==========================================

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

// ==========================================
// CONTROLE DOS CAMPOS
// ==========================================

function bloquearCampos(bloquearPrimeiro) {
    pessoaEditavel = Boolean(bloquearPrimeiro);

    const inputs = form.querySelectorAll('input, select');

    inputs.forEach((input, index) => {
        input.disabled = index === 0
            ? bloquearPrimeiro
            : !bloquearPrimeiro;
    });

    configurarFuncionario();
}

function configurarFuncionario() {
    const ativo = pessoaEditavel && checkboxFuncionario.checked;

    checkboxFuncionario.disabled = !pessoaEditavel;
    cargo.disabled = !ativo;
    salario.disabled = !ativo;

    cargo.required = ativo;
    salario.required = ativo;

    if (!checkboxFuncionario.checked) {
        cargo.value = '';
        salario.value = '';
    }
}

// ==========================================
// LIMPAR FORMULÁRIO
// ==========================================

function limparFormulario() {
    form.reset();

    checkboxFuncionario.checked = false;
    cargo.value = '';
    salario.value = '';

    currentPersonId = null;
    operacao = null;

    configurarFuncionario();
}

// ==========================================
// CARREGAR CARGOS
// ==========================================

async function carregarCargos() {
    try {
        const resposta = await fetch(`${API_BASE_URL}/cargo`);

        if (!resposta.ok) {
            throw new Error('Falha ao carregar cargos.');
        }

        const cargosLista = await resposta.json();

        cargo.innerHTML = '<option value="">Selecione um cargo</option>';

        cargosLista.forEach(item => {
            const opcao = document.createElement('option');

            opcao.value = item.id_cargo;
            opcao.textContent = item.nome_cargo;

            cargo.appendChild(opcao);
        });

        configurarFuncionario();

    } catch (erro) {
        console.error(erro);
        mostrarMensagem(erro.message, 'error');
    }
}

// ==========================================
// BOTÕES
// ==========================================

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

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function escapeHtml(texto) {
    if (texto === null || texto === undefined) return '';

    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatarData(dataString) {
    if (!dataString) return '';

    const data = String(dataString).substring(0, 10);
    const [ano, mes, dia] = data.split('-');

    return `${dia}/${mes}/${ano}`;
}

// ==========================================
// BUSCAR PESSOA
// ==========================================

async function buscarPessoa() {
    const id = searchId.value.trim();

    if (!id) {
        mostrarMensagem('Digite um CPF para buscar.', 'warning');
        return;
    }

    bloquearCampos(false);
    searchId.focus();

    try {
        const response = await fetch(
            `${API_BASE_URL}/pessoa/${encodeURIComponent(id)}`
        );

        if (response.ok) {
            const pessoa = await response.json();

            preencherFormulario(pessoa);

            mostrarBotoes(true, false, true, true, false, false);
            mostrarMensagem('Pessoa encontrada!', 'success');

        } else if (response.status === 404) {
            limparFormulario();

            searchId.value = id;

            mostrarBotoes(true, true, false, false, false, false);
            mostrarMensagem(
                'Pessoa não encontrada. Você pode cadastrar uma nova pessoa.',
                'info'
            );

            bloquearCampos(false);

        } else {
            throw new Error('Erro ao buscar pessoa.');
        }

    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao buscar pessoa.', 'error');
    }
}

// ==========================================
// PREENCHER FORMULÁRIO
// ==========================================

function preencherFormulario(pessoa) {
    currentPersonId = pessoa.cpf_pessoa;

    searchId.value = pessoa.cpf_pessoa;

    document.getElementById('nome_pessoa').value =
        pessoa.nome_pessoa || '';

    document.getElementById('data_nascimento_pessoa').value =
        pessoa.data_nascimento_pessoa || '';

    document.getElementById('endereco_pessoa').value =
        pessoa.endereco_pessoa || '';

    document.getElementById('telefone_pessoa').value =
        pessoa.telefone_pessoa || '';

    document.getElementById('email_pessoa').value =
        pessoa.email_pessoa || '';

    document.getElementById('usuario_pessoa').value =
        pessoa.usuario_pessoa || '';

    document.getElementById('senha_pessoa').value = '';

    checkboxFuncionario.checked = Boolean(pessoa.eh_funcionario);

    cargo.value = pessoa.cargo_id_cargo ?? '';

    salario.value = pessoa.salario_funcionario ?? '';

    configurarFuncionario();
}

// ==========================================
// INCLUIR PESSOA
// ==========================================

async function incluirPessoa() {
    const cpf = searchId.value;

    limparFormulario();

    searchId.value = cpf;

    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true);

    document.getElementById('nome_pessoa').focus();

    operacao = 'incluir';

    mostrarMensagem('Preencha os dados da pessoa.', 'info');
}

// ==========================================
// ALTERAR PESSOA
// ==========================================

async function alterarPessoa() {
    bloquearCampos(true);

    mostrarBotoes(false, false, false, false, true, true);

    document.getElementById('nome_pessoa').focus();

    operacao = 'alterar';

    mostrarMensagem('Altere os dados da pessoa.', 'info');
}

// ==========================================
// EXCLUIR PESSOA
// ==========================================

async function excluirPessoa() {
    mostrarMensagem('Preparando para excluir pessoa...', 'info');

    currentPersonId = searchId.value;

    searchId.disabled = true;

    bloquearCampos(false);

    mostrarBotoes(false, false, false, false, true, true);

    operacao = 'excluir';
}

// ==========================================
// SALVAR OPERAÇÃO
// ==========================================

async function salvarOperacao() {
    if (!operacao) {
        mostrarMensagem('Nenhuma operação selecionada.', 'warning');
        return;
    }

    const formData = new FormData(form);

    const pessoa = {
        cpf_pessoa: searchId.value.trim(),

        nome_pessoa: formData.get('nome_pessoa'),
        data_nascimento_pessoa: formData.get('data_nascimento_pessoa'),
        endereco_pessoa: formData.get('endereco_pessoa'),
        telefone_pessoa: formData.get('telefone_pessoa'),
        email_pessoa: formData.get('email_pessoa'),
        usuario_pessoa: formData.get('usuario_pessoa'),

        senha_pessoa: formData.get('senha_pessoa') || undefined,

        // TODA PESSOA CADASTRADA TAMBÉM SERÁ CLIENTE
        eh_cliente: true,

        // FUNCIONÁRIO É OPCIONAL
        eh_funcionario: checkboxFuncionario.checked,

        cargo_id_cargo: checkboxFuncionario.checked
            ? cargo.value
            : null,

        salario_funcionario: checkboxFuncionario.checked
            ? salario.value
            : null
    };

    if (pessoa.eh_funcionario && !pessoa.cargo_id_cargo) {
        mostrarMensagem('Selecione o cargo do funcionário.', 'warning');
        return;
    }

    if (pessoa.eh_funcionario && !pessoa.salario_funcionario) {
        mostrarMensagem('Informe o salário do funcionário.', 'warning');
        return;
    }

    let response = null;

    try {
        if (operacao === 'incluir') {
            response = await fetch(`${API_BASE_URL}/pessoa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pessoa)
            });

        } else if (operacao === 'alterar') {
            response = await fetch(
                `${API_BASE_URL}/pessoa/${encodeURIComponent(currentPersonId)}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pessoa)
                }
            );

        } else if (operacao === 'excluir') {
            response = await fetch(
                `${API_BASE_URL}/pessoa/${encodeURIComponent(currentPersonId)}`,
                {
                    method: 'DELETE'
                }
            );
        }

        if (!response) {
            throw new Error('Não foi possível realizar a operação.');
        }

        if (!response.ok) {
            let erro = {};

            try {
                erro = await response.json();
            } catch (_) {
                // Resposta sem JSON
            }

            throw new Error(
                erro.error || 'Não foi possível realizar a operação.'
            );
        }

        if (operacao !== 'excluir') {
            await response.json();
        }

        mostrarMensagem(
            operacao === 'excluir'
                ? 'Pessoa excluída com sucesso!'
                : `Operação ${operacao} realizada com sucesso!`,
            'success'
        );

        limparFormulario();

        await carregarPessoas();

    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem(error.message, 'error');
    }

    searchId.disabled = false;

    mostrarBotoes(true, false, false, false, false, false);

    bloquearCampos(false);

    searchId.focus();
}

// ==========================================
// CANCELAR OPERAÇÃO
// ==========================================

function cancelarOperacao() {
    limparFormulario();

    searchId.disabled = false;

    mostrarBotoes(true, false, false, false, false, false);

    bloquearCampos(false);

    searchId.focus();

    mostrarMensagem('Operação cancelada.', 'info');
}

// ==========================================
// CARREGAR PESSOAS
// ==========================================

async function carregarPessoas() {
    try {
        const response = await fetch(`${API_BASE_URL}/pessoa`);

        if (!response.ok) {
            throw new Error('Erro ao carregar pessoas.');
        }

        const pessoas = await response.json();

        renderizarTabelaPessoas(pessoas);

    } catch (error) {
        console.error('Erro:', error);
        mostrarMensagem('Erro ao carregar lista de pessoas.', 'error');
    }
}

// ==========================================
// TABELA DE PESSOAS
// ==========================================

function renderizarTabelaPessoas(pessoas) {
    pessoasTableBody.innerHTML = '';

    pessoas.forEach(pessoa => {
        const row = document.createElement('tr');

        const ehCliente = pessoa.eh_cliente;
        const ehFuncionario = pessoa.eh_funcionario;

        let tipoUsuario = 'Sem vínculo';

        if (ehCliente && ehFuncionario) {
            tipoUsuario = 'Cliente e funcionário';
        } else if (ehCliente) {
            tipoUsuario = 'Cliente';
        } else if (ehFuncionario) {
            tipoUsuario = 'Funcionário';
        }

        row.innerHTML = `
            <td>
                <button
                    class="btn-id"
                    onclick="selecionarPessoa('${escapeHtml(pessoa.cpf_pessoa)}')"
                >
                    ${escapeHtml(pessoa.cpf_pessoa)}
                </button>
            </td>

            <td>${escapeHtml(pessoa.nome_pessoa)}</td>
            <td>${formatarData(pessoa.data_nascimento_pessoa)}</td>
            <td>${escapeHtml(pessoa.email_pessoa)}</td>
            <td>${escapeHtml(pessoa.telefone_pessoa)}</td>
            <td>${escapeHtml(pessoa.endereco_pessoa)}</td>
            <td>${escapeHtml(tipoUsuario)}</td>
        `;

        pessoasTableBody.appendChild(row);
    });
}

// ==========================================
// SELECIONAR PESSOA PELA TABELA
// ==========================================

async function selecionarPessoa(cpf) {
    searchId.value = cpf;
    await buscarPessoa();
}