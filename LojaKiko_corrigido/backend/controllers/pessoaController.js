const { query, transaction } = require('../database');
const path = require('path');

// Tamanhos máximos dos campos no banco
const MAX = {
    cpf: 20,
    nome: 60,
    endereco: 150,
    senha: 50,
    email: 75,
    usuario: 50,
    telefone: 20
};

// to_char evita que a data de nascimento volte como Date com fuso horário
const COLUNAS = `cpf_pessoa, nome_pessoa,
                 to_char(data_nascimento_pessoa, 'YYYY-MM-DD') AS data_nascimento_pessoa,
                 endereco_pessoa, senha_pessoa, email_pessoa, usuario_pessoa, telefone_pessoa`;

exports.abrirCrudPessoa = (req, res) => {
    const usuario = req.cookies.usuarioLogado;

    if (usuario) {
        res.sendFile(path.join(__dirname, '../../frontend/pessoa/pessoa.html'));
    } else {
        res.redirect('/login');
    }
};

// Texto opcional: string vazia vira NULL
function textoOpcional(valor) {
    const t = (valor || '').toString().trim();
    return t === '' ? null : t;
}

// Valida e normaliza os dados (usado no criar e no atualizar)
// Retorna { erro } ou { dados }
function validarPessoa(body) {
    const nome_pessoa = (body.nome_pessoa || '').trim();

    if (!nome_pessoa) {
        return { erro: 'O nome da pessoa é obrigatório' };
    }
    if (nome_pessoa.length > MAX.nome) {
        return { erro: `O nome deve ter no máximo ${MAX.nome} caracteres` };
    }

    const endereco_pessoa = textoOpcional(body.endereco_pessoa);
    if (endereco_pessoa && endereco_pessoa.length > MAX.endereco) {
        return { erro: `O endereço deve ter no máximo ${MAX.endereco} caracteres` };
    }

    const senha_pessoa = textoOpcional(body.senha_pessoa);
    if (senha_pessoa && senha_pessoa.length > MAX.senha) {
        return { erro: `A senha deve ter no máximo ${MAX.senha} caracteres` };
    }

    const email_pessoa = textoOpcional(body.email_pessoa);
    if (email_pessoa) {
        if (email_pessoa.length > MAX.email) {
            return { erro: `O e-mail deve ter no máximo ${MAX.email} caracteres` };
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_pessoa)) {
            return { erro: 'E-mail inválido' };
        }
    }

    const usuario_pessoa = textoOpcional(body.usuario_pessoa);
    if (usuario_pessoa && usuario_pessoa.length > MAX.usuario) {
        return { erro: `O usuário deve ter no máximo ${MAX.usuario} caracteres` };
    }

    const telefone_pessoa = textoOpcional(body.telefone_pessoa);
    if (telefone_pessoa && telefone_pessoa.length > MAX.telefone) {
        return { erro: `O telefone deve ter no máximo ${MAX.telefone} caracteres` };
    }

    // Data de nascimento (opcional, formato YYYY-MM-DD)
    const data_nascimento_pessoa = textoOpcional(body.data_nascimento_pessoa);
    if (data_nascimento_pessoa && !/^\d{4}-\d{2}-\d{2}$/.test(data_nascimento_pessoa)) {
        return { erro: 'Data de nascimento inválida' };
    }

    return {
        dados: {
            nome_pessoa,
            data_nascimento_pessoa,
            endereco_pessoa,
            senha_pessoa,
            email_pessoa,
            usuario_pessoa,
            telefone_pessoa
        }
    };
}

exports.listarPessoas = async (req, res) => {
    try {
        // A senha não vai na listagem
        const result = await query(
            `SELECT p.cpf_pessoa, p.nome_pessoa,
                    to_char(p.data_nascimento_pessoa, 'YYYY-MM-DD') AS data_nascimento_pessoa,
                    p.endereco_pessoa, p.email_pessoa, p.usuario_pessoa, p.telefone_pessoa,
                    (f.pessoa_cpf_pessoa IS NOT NULL) AS eh_funcionario,
                    f.salario_funcionario, f.cargo_id_cargo, c.nome_cargo,
                    (cli.pessoa_cpf_pessoa IS NOT NULL) AS eh_cliente,
                    to_char(cli.data_cadastro_cliente, 'YYYY-MM-DD') AS data_cadastro_cliente
               FROM pessoa p
               LEFT JOIN funcionario f ON f.pessoa_cpf_pessoa = p.cpf_pessoa
               LEFT JOIN cargo c ON c.id_cargo = f.cargo_id_cargo
               LEFT JOIN cliente cli ON cli.pessoa_cpf_pessoa = p.cpf_pessoa
              ORDER BY p.nome_pessoa`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar pessoas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

async function sincronizarFuncionario(client, cpf, body) {
    const ehFuncionario = body.eh_funcionario === true || body.eh_funcionario === 'true' || body.eh_funcionario === 'on';
    if (!ehFuncionario) {
        // Se já for funcionário, tenta remover somente a especialização.
        // O banco impede a remoção caso existam pedidos vinculados.
        await client.query('DELETE FROM funcionario WHERE pessoa_cpf_pessoa = $1', [cpf]);
        return;
    }

    const cargo = Number(body.cargo_id_cargo);
    const salario = Number(String(body.salario_funcionario ?? '').replace(',', '.'));
    if (!Number.isInteger(cargo) || cargo <= 0) {
        const erro = new Error('Selecione um cargo válido para o funcionário');
        erro.status = 400;
        throw erro;
    }
    if (String(body.salario_funcionario ?? '').trim() === '' || !Number.isFinite(salario) || salario < 0) {
        const erro = new Error('Informe um salário válido para o funcionário');
        erro.status = 400;
        throw erro;
    }

    await client.query(
        `INSERT INTO funcionario (pessoa_cpf_pessoa, salario_funcionario, cargo_id_cargo)
         VALUES ($1, $2, $3)
         ON CONFLICT (pessoa_cpf_pessoa) DO UPDATE
         SET salario_funcionario = EXCLUDED.salario_funcionario,
             cargo_id_cargo = EXCLUDED.cargo_id_cargo`,
        [cpf, salario, cargo]
    );
}

async function sincronizarCliente(client, cpf, body = {}) {

    // TODA PESSOA CADASTRADA É CLIENTE AUTOMATICAMENTE

    const data = body.data_cadastro_cliente
        ? String(body.data_cadastro_cliente).trim()
        : null;

    if (data && !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        const erro = new Error('Data de cadastro do cliente inválida');
        erro.status = 400;
        throw erro;
    }

    await client.query(
        `INSERT INTO cliente (
            pessoa_cpf_pessoa,
            data_cadastro_cliente
        )
        VALUES (
            $1,
            COALESCE($2::date, CURRENT_DATE)
        )
        ON CONFLICT (pessoa_cpf_pessoa) DO NOTHING`,
        [cpf, data]
    );
}

exports.criarPessoa = async (req, res) => {
    try {
        // Na pessoa o CPF É a chave primária e vem do front (não há sequence)
        const cpf_pessoa = (req.body.cpf_pessoa || '').toString().trim();

        if (!cpf_pessoa) {
            return res.status(400).json({ error: 'O CPF é obrigatório' });
        }
        if (cpf_pessoa.length > MAX.cpf) {
            return res.status(400).json({ error: `O CPF deve ter no máximo ${MAX.cpf} caracteres` });
        }

        const { erro, dados } = validarPessoa(req.body);

        if (erro) {
            return res.status(400).json({ error: erro });
        }

        const pessoaCriada = await transaction(async (client) => {
            const result = await client.query(
                `INSERT INTO pessoa
                    (cpf_pessoa, nome_pessoa, data_nascimento_pessoa, endereco_pessoa,
                     senha_pessoa, email_pessoa, usuario_pessoa, telefone_pessoa)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING ${COLUNAS}`,
                [cpf_pessoa, dados.nome_pessoa, dados.data_nascimento_pessoa,
                    dados.endereco_pessoa, dados.senha_pessoa, dados.email_pessoa,
                    dados.usuario_pessoa, dados.telefone_pessoa]
            );
            await sincronizarFuncionario(client, cpf_pessoa, req.body);
            await sincronizarCliente(client, cpf_pessoa, req.body);
            return result.rows[0];
        });

        res.status(201).json(pessoaCriada);
    } catch (error) {
        console.error('Erro ao criar pessoa:', error);

        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === '23503') return res.status(400).json({ error: 'Cargo inválido ou funcionário vinculado a pedidos.' });

        // NOT NULL violado
        if (error.code === '23502') {
            return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
        }

        // UNIQUE violado: pode ser o CPF (PK) ou o e-mail
        if (error.code === '23505') {
            if (error.constraint && error.constraint.includes('email')) {
                return res.status(409).json({ error: 'Já existe uma pessoa com esse e-mail' });
            }
            return res.status(409).json({ error: 'Já existe uma pessoa com esse CPF' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterPessoa = async (req, res) => {
    try {
        const id = (req.params.id || '').trim();

        if (!id) {
            return res.status(400).json({ error: 'CPF inválido' });
        }

        const result = await query(
            `SELECT p.cpf_pessoa, p.nome_pessoa,
                    to_char(p.data_nascimento_pessoa, 'YYYY-MM-DD') AS data_nascimento_pessoa,
                    p.endereco_pessoa, p.email_pessoa, p.usuario_pessoa, p.telefone_pessoa,
                    (f.pessoa_cpf_pessoa IS NOT NULL) AS eh_funcionario,
                    f.salario_funcionario, f.cargo_id_cargo,
                    (cli.pessoa_cpf_pessoa IS NOT NULL) AS eh_cliente,
                    to_char(cli.data_cadastro_cliente, 'YYYY-MM-DD') AS data_cadastro_cliente
               FROM pessoa p
               LEFT JOIN funcionario f ON f.pessoa_cpf_pessoa = p.cpf_pessoa
               LEFT JOIN cliente cli ON cli.pessoa_cpf_pessoa = p.cpf_pessoa
              WHERE p.cpf_pessoa = $1`, [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter pessoa:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.atualizarPessoa = async (req, res) => {
    try {
        const id = (req.params.id || '').trim();

        if (!id) {
            return res.status(400).json({ error: 'CPF inválido' });
        }

        const { erro, dados } = validarPessoa(req.body);

        if (erro) {
            return res.status(400).json({ error: erro });
        }

        // O CPF (PK) não é alterado: é usado só no WHERE
        const result = await transaction(async (client) => {
            const atualizado = await client.query(
                `UPDATE pessoa
                    SET nome_pessoa = $1,
                        data_nascimento_pessoa = $2,
                        endereco_pessoa = $3,
                        senha_pessoa = COALESCE($4, senha_pessoa),
                        email_pessoa = $5,
                        usuario_pessoa = $6,
                        telefone_pessoa = $7
                  WHERE cpf_pessoa = $8
                  RETURNING ${COLUNAS}`,
                [dados.nome_pessoa, dados.data_nascimento_pessoa, dados.endereco_pessoa,
                dados.senha_pessoa, dados.email_pessoa, dados.usuario_pessoa,
                dados.telefone_pessoa, id]
            );
            if (atualizado.rows.length) {
                await sincronizarFuncionario(client, id, req.body);
                await sincronizarCliente(client, id, req.body);
            }
            return atualizado;
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar pessoa:', error);

        if (error.status) return res.status(error.status).json({ error: error.message });
        if (error.code === '23503') return res.status(400).json({ error: 'Cargo inválido ou funcionário vinculado a pedidos.' });

        // E-mail já usado por outra pessoa
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Já existe uma pessoa com esse e-mail' });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.deletarPessoa = async (req, res) => {
    try {
        const id = (req.params.id || '').trim();

        if (!id) {
            return res.status(400).json({ error: 'CPF inválido' });
        }

        // As FKs funcionario -> pessoa e cliente -> pessoa NÃO têm ON DELETE CASCADE,
        // então pessoa que já é funcionário/cliente gera erro 23503 (tratado abaixo)
        const result = await query(
            'DELETE FROM pessoa WHERE cpf_pessoa = $1 RETURNING cpf_pessoa',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Erro ao deletar pessoa:', error);

        // Violação de foreign key (pessoa é funcionário e/ou cliente)
        if (error.code === '23503') {
            return res.status(400).json({
                error: 'Não é possível deletar: esta pessoa está cadastrada como funcionário ou cliente'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};