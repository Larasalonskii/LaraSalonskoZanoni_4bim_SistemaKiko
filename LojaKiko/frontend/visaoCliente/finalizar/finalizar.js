
let valorTotal = 0;

const API_BASE_URL = window.location.origin;

// ======================================================
// OBTER CARRINHO
// ======================================================

function obterCarrinho() {
    try {
        return JSON.parse(sessionStorage.getItem('carrinho')) || [];
    } catch (error) {
        console.error('Erro ao ler carrinho:', error);
        return [];
    }
}

// ======================================================
// FORMATAR PREÇO
// ======================================================

function formatarPreco(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// ======================================================
// CARREGAR TELA DE FINALIZAÇÃO
// ======================================================

function carregarFinalizar() {

    const tbodyLista = document.getElementById('listaFinalizar');
    const carrinho = obterCarrinho();

    tbodyLista.innerHTML = '';

    let total = 0;

    const botaoFinalizar =
        document.getElementById('btn-finalizar');

    if (carrinho.length === 0) {

        tbodyLista.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:20px;">
                    Carrinho vazio. Volte e adicione itens.
                </td>
            </tr>
        `;

        botaoFinalizar.disabled = true;

        document.getElementById('total-final').textContent =
            'Total Final: R$ 0,00';

        valorTotal = 0;

        return;
    }

    botaoFinalizar.disabled = false;

    carrinho.forEach(prod => {

        const codigo = prod.id_produto_tom || prod.id || prod.codigo;

        const quantidade = Number(prod.quantidade);

        const preco = Number(prod.preco);

        if (
            !codigo ||
            !Number.isInteger(quantidade) ||
            quantidade < 1 ||
            !Number.isFinite(preco) ||
            preco < 0
        ) {
            throw new Error(
                `Produto com dados inválidos: ${prod.nome || 'Sem nome'}`
            );
        }

        // PREÇO POR UNIDADE
        const subtotal = preco * quantidade;

        total += subtotal;

        const linha = document.createElement('tr');

        const valores = [
            codigo,
            prod.nome,
            `${formatarPreco(preco)} / unidade`,
            `${quantidade} unidade(s)`,
            formatarPreco(subtotal)
        ];

        valores.forEach(valor => {
            const td = document.createElement('td');
            td.textContent = valor;
            linha.appendChild(td);
        });

        tbodyLista.appendChild(linha);
    });

    document.getElementById('total-final').textContent =
        `Valor total: ${formatarPreco(total)}`;

    valorTotal = total;
}

// ======================================================
// PREPARAR ITENS DO PEDIDO
// ======================================================

function obterCarrinhoDoStorage(idPedido) {
    const carrinho = obterCarrinho();

    return carrinho.map(item => ({
        pedido_id_pedido: Number(idPedido),
        produto_tom_id_produto_tom: Number(item.id_produto_tom),
        quantidade: Number(item.quantidade),
        preco_unitario: Number(item.preco)
    }));
}

// ======================================================
// ENVIAR PEDIDO AO BANCO
// ======================================================

async function enviarDadosParaBD() {

    const carrinho = obterCarrinho();

    if (carrinho.length === 0) {
        mostrarAlerta('O carrinho está vazio.');
        return;
    }

    const botaoFinalizar =
        document.getElementById('btn-finalizar');

    try {

        // Recalcular total antes de enviar
        valorTotal = carrinho.reduce((total, item) => {
            return total +
                (Number(item.preco) * Number(item.quantidade));
        }, 0);

        // Validar itens
        for (const item of carrinho) {

            const id = item.id_produto_tom;

            if (
                !id ||
                !Number.isInteger(Number(item.quantidade)) ||
                Number(item.quantidade) < 1 ||
                !Number.isFinite(Number(item.preco)) ||
                Number(item.preco) < 0
            ) {
                throw new Error(
                    `Dados inválidos no produto: ${item.nome}`
                );
            }
        }

        botaoFinalizar.disabled = true;
        botaoFinalizar.textContent = 'Finalizando...';

        console.log('CARRINHO:', carrinho);

        // ==============================================
        // DATA DO PEDIDO
        // ==============================================

        const hoje = new Date();

        const dataAtual = [
            hoje.getFullYear(),
            String(hoje.getMonth() + 1).padStart(2, '0'),
            String(hoje.getDate()).padStart(2, '0')
        ].join('-');

        // ==============================================
        // CRIAR PEDIDO
        // ==============================================

        // O cliente precisa estar autenticado para concluir a compra.
        const sessaoResposta = await fetch(`${API_BASE_URL}/login/verificaSeUsuarioEstaLogado`, {
            credentials: 'include'
        });
        const sessao = await sessaoResposta.json();
        if (sessao.status !== 'ok') {
            mostrarAlerta('Entre na sua conta para finalizar a compra.');
            window.location.href =
    '/login?retorno=' +
    encodeURIComponent('/login/visaoclientefinalizar');
            return;
        }
        const usuario = JSON.parse(sessao.usuario || '{}');
        if (!usuario.ehCliente || !usuario.cpf_pessoa) {
            mostrarAlerta('Sua conta não está cadastrada como cliente. Faça o cadastro de cliente ou entre com uma conta de cliente.');
            window.location.href =
    '/login?retorno=' +
    encodeURIComponent('/login/visaoclientefinalizar');
            return;
        }

        // A loja utiliza o funcionário de atendimento online (cargo 0),
        // ou o primeiro funcionário ativo caso esse cargo não esteja cadastrado.
        const funcionariosResposta = await fetch(`${API_BASE_URL}/funcionario`);
        if (!funcionariosResposta.ok) throw new Error('Não foi possível identificar o funcionário responsável pelo pedido.');
        const funcionarios = await funcionariosResposta.json();
        const funcionarioResponsavel = funcionarios.find(f => Number(f.cargo_id_cargo) === 0) || funcionarios[0];
        if (!funcionarioResponsavel) throw new Error('Cadastre ao menos um funcionário para receber os pedidos.');

        const pedido = {
            data_pedido: dataAtual,
            cliente_pessoa_cpf_pessoa: usuario.cpf_pessoa,
            funcionario_pessoa_cpf_pessoa: funcionarioResponsavel.pessoa_cpf_pessoa,
            itens: carrinho.map(item => ({
                produto_tom_id: Number(item.id_produto_tom),
                quantidade: Number(item.quantidade)
            }))
        };

        console.log(
            'PEDIDO ENVIADO:',
            JSON.stringify(pedido, null, 2)
        );

        const resposta = await fetch(
            `${API_BASE_URL}/pedido`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pedido)
            }
        );

        const dadosResposta =
            await resposta.json().catch(() => null);

        if (!resposta.ok) {

            console.error('ERRO AO CRIAR PEDIDO:', dadosResposta);

            throw new Error(
                dadosResposta?.error ||
                dadosResposta?.message ||
                `Erro ao criar pedido. Status: ${resposta.status}`
            );
        }

        const dados = dadosResposta;

        console.log('PEDIDO CRIADO:', dados);

        if (!dados || !dados.id_pedido) {
            throw new Error(
                'O servidor não retornou o ID do pedido.'
            );
        }

        

        // ==============================================
        // PREPARAR PAGAMENTO
        // ==============================================

        const dadosPagamento = {

            id_pedido: dados.id_pedido,

            valor_total: valorTotal

        };

        sessionStorage.setItem(
            'dadosPagamento',
            JSON.stringify(dadosPagamento)
        );

        // ==============================================
        // IR PARA PAGAMENTO
        // ==============================================

        window.location.href = `${API_BASE_URL}/pagamento/abrirTelaPagamento`; 

    } catch (erro) {

        console.error(
            'ERRO COMPLETO AO FINALIZAR:',
            erro
        );

        mostrarAlerta(
            `Ocorreu um erro ao finalizar o pedido.\n\nDetalhes: ${erro.message}`
        );

        botaoFinalizar.disabled = false;

        botaoFinalizar.textContent = 'Finalizar Pedido';
    }
}

// ======================================================
// EVENTOS
// ======================================================

document.addEventListener('DOMContentLoaded', () => {

    document
        .getElementById('btn-finalizar')
        .addEventListener('click', enviarDadosParaBD);

    carregarFinalizar();

});
