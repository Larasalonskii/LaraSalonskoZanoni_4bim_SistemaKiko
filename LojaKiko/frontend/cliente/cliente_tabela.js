
document.addEventListener('DOMContentLoaded', carregarClientes);

async function carregarClientes() {
    const tabela = document.getElementById('clientesTableBody');
    const total = document.getElementById('totalClientes');

    try {
        const resposta = await fetch('/cliente/', {
            credentials: 'include'
        });

        if (!resposta.ok) {
            throw new Error('Não foi possível carregar os clientes.');
        }

        const clientes = await resposta.json();

        total.textContent = `${clientes.length} cliente(s)`;

        if (clientes.length === 0) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="3">Nenhum cliente cadastrado.</td>
                </tr>
            `;
            return;
        }

        tabela.innerHTML = clientes.map(cliente => `
            <tr>
                <td>${escaparHTML(cliente.pessoa_cpf_pessoa)}</td>
                <td>${escaparHTML(cliente.nome_pessoa)}</td>
                <td>${escaparHTML(cliente.data_cadastro_cliente || '-')}</td>
            </tr>
        `).join('');

    } catch (erro) {
        console.error(erro);

        tabela.innerHTML = `
            <tr>
                <td colspan="3">Erro ao carregar os clientes.</td>
            </tr>
        `;

        total.textContent = 'Erro';
    }
}

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}
