const db = require('../database.js');


const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.abrirTelaLogin = (req, res) => {
    // console.log('loginController - Rota /login - Acessando login.html');
    res.sendFile(path.join(__dirname, '../../frontend/login/login.html'));
};

exports.abrirEscolhaPerfil = (req, res) => {
    const usuario = lerUsuarioCookie(req);
    if (!usuario) return res.redirect('/login');
    if (!usuario.ehFuncionario) return res.redirect('/menu');
    res.sendFile(path.join(__dirname, '../../frontend/login/escolher-perfil.html'));
};

function lerUsuarioCookie(req) {
    try {
        return JSON.parse(req.cookies.usuarioLogado || 'null');
    } catch (_) {
        return null;
    }
}


// Exige login de cliente para acessar a finalização.
exports.exigirClienteParaPagina = (req, res, next) => {
    const usuario = lerUsuarioCookie(req);

    const estaNoModoCliente =
        !usuario?.ehFuncionario || usuario.modo === 'cliente';

    if (
        !usuario ||
        !usuario.ehCliente ||
        !usuario.cpf_pessoa ||
        !estaNoModoCliente
    ) {
        const destino = req.originalUrl;

        return res.redirect(
            `/login?retorno=${encodeURIComponent(destino)}`
        );
    }

    req.usuarioLogado = usuario;
    next();
};


// Protege a criação de pedidos pela API.
exports.exigirLoginParaCriarPedido = (req, res, next) => {
    const usuario = lerUsuarioCookie(req);

    if (!usuario) {
        return res.status(401).json({
            error: 'Entre na sua conta para finalizar a compra.'
        });
    }

    const funcionarioNoModoFuncionario =
        !!usuario.ehFuncionario && usuario.modo === 'funcionario';

    const clienteNoModoCliente =
        !!usuario.ehCliente &&
        !!usuario.cpf_pessoa &&
        (!usuario.ehFuncionario || usuario.modo === 'cliente');

    if (!funcionarioNoModoFuncionario && !clienteNoModoCliente) {
        return res.status(403).json({
            error: 'Sua conta não tem permissão para criar este pedido.'
        });
    }

    // O CPF do pedido vem da sessão do cliente.
    if (clienteNoModoCliente) {
        req.body.cliente_pessoa_cpf_pessoa = usuario.cpf_pessoa;
    }

    req.usuarioLogado = usuario;
    next();
};


exports.selecionarModo = (req, res) => {
    const usuario = lerUsuarioCookie(req);
    if (!usuario) return res.status(401).json({ status: 'nao_logado' });

    const modo = String(req.body.modo || '').toLowerCase();
    if (!['cliente', 'funcionario'].includes(modo)) {
        return res.status(400).json({ status: 'modo_invalido' });
    }

    // A troca para o modo funcionário só é permitida a quem possui vínculo
    // de funcionário registrado no próprio cookie de autenticação.
    if (modo === 'funcionario' && !usuario.ehFuncionario) {
        return res.status(403).json({ status: 'sem_permissao' });
    }

    usuario.modo = modo;
    res.cookie('usuarioLogado', JSON.stringify(usuario), {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
        maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({ status: 'ok', modo });
};

exports.abrirVisaoCliente = (req, res) => {
    console.log('loginController - Rota /login - visão do cliente');
    res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/index.html'));
};

exports.abrirVisaoClienteCarrinho = (req, res) => {
    console.log('loginController - Rota /login - visão do cliente - carrinho');
    res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/carrinho/carrinho.html'));

};

exports.abrirVisaoClienteFinalizar = (req, res) => {
    console.log('loginController - Rota /login - visão do cliente - finalizar');
    res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/finalizar/finalizar.html'));

};


exports.abrirVisaoClientePagamento = (req, res) => {
    console.log('loginController - Rota /login - visão do cliente - pagamento');
    res.sendFile(path.join(__dirname, '../../frontend/visaoCliente/pagamento/pagamento.html'));

};


exports.verificaSeUsuarioEstaLogado = (req, res) => {
    //console.log('loginController -> verificaSeUsuarioEstaLogado - Verificando se usuário está logado via cookie');

    const usuario = req.cookies.usuarioLogado; // O cookie deve conter o nome/ID do usuário

    // Se o cookie 'usuario' existe (o valor é uma string/nome do usuário)
    if (usuario) {
        console.log('loginController -> verificaSeUsuarioEstaLogado - Usuário está logado:', usuario);
        // Usuário está logado. Retorna 'ok' e os dados do usuário.
        // É importante garantir que o valor do cookie 'usuarioLogado' seja o nome/ID do usuário.
        res.json({
            status: 'ok',
            usuario: usuario // Retorna o valor do cookie, que é o nome/ID do usuário
        });
    } else {
        // Cookie não existe. Usuário NÃO está logado.
        // res.json({
        //   status: 'nao_logado',
        //   mensagem: 'Usuário não autenticado.'
        // });

        res.json({ status: 'nao_logado', mensagem: 'Usuário não autenticado.' });
    }
}
exports.verificarEmail = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();

    const sql = 'SELECT nome_pessoa FROM pessoa WHERE LOWER(email_pessoa) = $1'; // Postgres usa $1, $2...

    console.log('rota verificarEmail: ', sql, email);

    try {
        const result = await db.query(sql, [email]); // igual listarPessoas

        if (result.rows.length > 0) {
            return res.json({ status: 'existe', nome: result.rows[0].nome_pessoa });
        }

        res.json({ status: 'nao_encontrado' });
    } catch (err) {
        console.error('Erro em verificarEmail:', err);
        res.status(500).json({ status: 'erro', mensagem: err.message });
    }
};


// Verificar senha
exports.verificarSenha = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const senha = String(req.body.senha || '');

    const sqlPessoa = `
    SELECT cpf_pessoa, nome_pessoa 
    FROM pessoa 
    WHERE LOWER(email_pessoa) = $1 AND senha_pessoa = $2
  `;
    const sqlCliente = `
    SELECT * 
    FROM cliente 
    WHERE pessoa_cpf_pessoa = $1
  `;

    const sqlFuncionario = `
    SELECT c.id_cargo , c.nome_cargo 
    FROM funcionario f, cargo c
    WHERE pessoa_cpf_pessoa = $1 and c.id_cargo = f.cargo_id_cargo ;`;

    //console.log('Rota verificarSenha:', sqlPessoa, email, senha);

    try {
        // 1. Verifica se existe pessoa com email/senha
        const resultPessoa = await db.query(sqlPessoa, [email, senha]);

        if (resultPessoa.rows.length === 0) {
            return res.json({ status: 'senha_incorreta' });
        }

        const { cpf_pessoa, nome_pessoa } = resultPessoa.rows[0];
        console.log('loginController -> Usuário encontrado:', resultPessoa.rows[0]);

        // 2. Verifica se é cliente
        const resultCliente = await db.query(sqlCliente, [cpf_pessoa]);

        let ehCliente = null;
        if (resultCliente.rows.length === 0) {
            ehCliente = false;
        } else {
            ehCliente = true;
        }

        // 2b. Verifica se é funcionário
        const resultFuncionario = await db.query(sqlFuncionario, [cpf_pessoa]);


        let funcionario = {};
        if (resultFuncionario.rows.length > 0) {
            funcionario = resultFuncionario.rows[0];
            console.log('Usuário é funcionário:', funcionario);
            console.log(`Cargo do funcionário: ID=${funcionario.id_cargo}, Nome=${funcionario.nome_cargo}`);
        } else {
            // Cliente comum não deve receber permissões de funcionário.
            funcionario = null;
            console.log('loginController -> Usuário não é funcionário.');
        }


        //console.log(`loginController -> verificaSenha - Tipo de usuário - Cliente: ${ehCliente}`);



        const dadosUsuario = {
            cpf_pessoa: cpf_pessoa,
            nome: nome_pessoa,
            ehCliente: ehCliente,
            ehFuncionario: funcionario,
            modo: funcionario ? null : 'cliente'
        };

        // 3. Define cookie
        res.cookie('usuarioLogado', JSON.stringify(dadosUsuario), {
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            path: '/',
            maxAge: 24 * 60 * 60 * 1000, // 1 dia
        });

        console.log("Cookie 'usuarioLogado' definido com sucesso");

        // 4. Retorna dados para o frontend, o cookie será enviado ao frontend
        return res.json({
            status: 'ok',
            nome: nome_pessoa,
            ehFuncionario: !!funcionario,
        });

    } catch (err) {
        console.error('Erro ao verificar senha:', err);
        return res.status(500).json({ status: 'erro', mensagem: err.message });
    }
}


// Logout
exports.logout = (req, res) => {
    res.clearCookie('usuarioLogado', {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        path: '/',
    });
    console.log("Cookie 'usuarioLogado' removido com sucesso");
    res.json({ status: 'deslogado' });
}


// Cadastro feito pela tela de cadastro: cria a pessoa e já registra como cliente
exports.cadastrar = async (req, res) => {
    const { nome, usuario, email, cpf, dataNascimento, telefone, senha } = req.body || {};

    if (!nome || !usuario || !email || !cpf || !senha || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ status: 'dados_invalidos' });
    }

    try {
        const jaExiste = async (coluna, valor) => {
            const r = await db.query(`SELECT 1 FROM pessoa WHERE ${coluna} = $1 LIMIT 1`, [valor]);
            return r.rows.length > 0;
        };

        if (await jaExiste('email_pessoa', email)) return res.status(409).json({ status: 'email_existe' });
        if (await jaExiste('cpf_pessoa', cpf)) return res.status(409).json({ status: 'cpf_existe' });
        if (await jaExiste('usuario_pessoa', usuario)) return res.status(409).json({ status: 'usuario_existe' });

        await db.transaction(async (client) => {
            await client.query(
                `INSERT INTO pessoa (cpf_pessoa, nome_pessoa, data_nascimento_pessoa, senha_pessoa,
                                     email_pessoa, usuario_pessoa, telefone_pessoa)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [cpf, nome, dataNascimento || null, senha, String(email).trim().toLowerCase(), usuario, telefone || null]
            );
            await client.query(
                'INSERT INTO cliente (pessoa_cpf_pessoa, data_cadastro_cliente) VALUES ($1, CURRENT_DATE)',
                [cpf]
            );
        });

        res.status(201).json({ status: 'ok' });
    } catch (error) {
        console.error('Erro em cadastrar:', error);
        if (error.code === '23505') {
            const status = (error.constraint || '').includes('email') ? 'email_existe' : 'cpf_existe';
            return res.status(409).json({ status });
        }
        res.status(500).json({ status: 'erro' });
    }
};

exports.criarPessoa = async (req, res) => {
    //  console.log('Criando pessoa com dados:', req.body);
    try {
        const { cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa } = req.body;

        // Validação básica
        if (!nome_pessoa || !email_pessoa || !senha_pessoa) {
            return res.status(400).json({
                error: 'Nome, email e senha são obrigatórios'
            });
        }

        // Validação de email básica
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_pessoa)) {
            return res.status(400).json({
                error: 'Formato de email inválido'
            });
        }

        const result = await db.query(
            'INSERT INTO pessoa (cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [cpf_pessoa, nome_pessoa, email_pessoa, senha_pessoa, data_nascimento_pessoa || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao criar pessoa:', error);

        // Verifica se é erro de email duplicado (constraint unique violation)
        if (error.code === '23505' && error.constraint === 'pessoa_email_pessoa_key') {
            return res.status(400).json({
                error: 'Email já está em uso'
            });
        }

        // Verifica se é erro de violação de constraint NOT NULL
        if (error.code === '23502') {
            return res.status(400).json({
                error: 'Dados obrigatórios não fornecidos'
            });
        }

        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

exports.obterPessoa = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) {
            return res.status(400).json({ error: 'loginController-obterPessoa - ID deve ser um número válido' });
        }

        const result = await db.query(
            'SELECT * FROM pessoa WHERE cpf_pessoa = $1',
            [id]
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


// Função adicional para buscar pessoa por email
exports.obterPessoaPorEmail = async (req, res) => {
    try {
        const { email } = req.params;

        if (!email) {
            return res.status(400).json({ error: 'Email é obrigatório' });
        }

        const result = await db.query(
            'SELECT * FROM pessoa WHERE email_pessoa = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao obter pessoa por email:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

// Função para atualizar apenas a senha
exports.atualizarSenha = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { senha_atual, nova_senha } = req.body;

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID deve ser um número válido' });
        }

        if (!senha_atual || !nova_senha) {
            return res.status(400).json({
                error: 'Senha atual e nova senha são obrigatórias'
            });
        }

        // Verifica se a pessoa existe e a senha atual está correta
        const personResult = await db.query(
            'SELECT * FROM pessoa WHERE cpf_pessoa = $1',
            [id]
        );

        if (personResult.rows.length === 0) {
            return res.status(404).json({ error: 'Pessoa não encontrada' });
        }

        const person = personResult.rows[0];

        // Verificação básica da senha atual (em produção, use hash)
        if (person.senha_pessoa !== senha_atual) {
            return res.status(400).json({ error: 'Senha atual incorreta' });
        }

        // Atualiza apenas a senha
        const updateResult = await db.query(
            'UPDATE pessoa SET senha_pessoa = $1 WHERE cpf_pessoa = $2 RETURNING cpf_pessoa, nome_pessoa, email_pessoa, primeiro_acesso_pessoa, data_nascimento',
            [nova_senha, id]
        );

        res.json(updateResult.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};




// ======================================================
// RECUPERAÇÃO DE SENHA POR CÓDIGO
// ======================================================

async function garantirTabelaTokensRecuperacao() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS recuperacao_senha (
            id_recuperacao BIGSERIAL PRIMARY KEY,
            pessoa_cpf_pessoa VARCHAR(20) NOT NULL REFERENCES pessoa(cpf_pessoa) ON DELETE CASCADE,
            token_hash CHAR(64) NOT NULL UNIQUE,
            expira_em TIMESTAMP NOT NULL,
            criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.query(
        'CREATE INDEX IF NOT EXISTS idx_recuperacao_token_hash ON recuperacao_senha(token_hash)'
    );
}

function criarTransportadorEmail() {
    const obrigatorias = [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'SMTP_FROM'
    ];

    const faltando = obrigatorias.filter(chave => !process.env[chave]);

    if (faltando.length) {
        throw new Error(
            `Configure as variáveis de e-mail no arquivo .env: ${faltando.join(', ')}`
        );
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

exports.solicitarRecuperacaoSenha = async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
            status: 'email_invalido',
            mensagem: 'Informe um e-mail válido.'
        });
    }

    try {
        await garantirTabelaTokensRecuperacao();

        const pessoa = await db.query(
            `SELECT cpf_pessoa, nome_pessoa, email_pessoa
             FROM pessoa
             WHERE LOWER(email_pessoa) = $1
             LIMIT 1`,
            [email]
        );

        // A resposta não revela se o e-mail existe no cadastro.
        if (pessoa.rows.length) {
            const registro = pessoa.rows[0];

            // Gera código numérico de 6 dígitos.
            const token = String(crypto.randomInt(100000, 1000000));

            // Salva somente o hash do código.
            const tokenHash = crypto
                .createHash('sha256')
                .update(token)
                .digest('hex');

            const expiraEm = new Date(Date.now() + 30 * 60 * 1000);

            // Remove códigos anteriores da pessoa e códigos expirados.
            await db.query(
                `DELETE FROM recuperacao_senha
                 WHERE pessoa_cpf_pessoa = $1 OR expira_em < NOW()`,
                [registro.cpf_pessoa]
            );

            await db.query(
                `INSERT INTO recuperacao_senha
                 (pessoa_cpf_pessoa, token_hash, expira_em)
                 VALUES ($1, $2, $3)`,
                [registro.cpf_pessoa, tokenHash, expiraEm]
            );

            const nomeSeguro = String(registro.nome_pessoa).replace(
                /[&<>"']/g,
                caractere => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[caractere])
            );

            const transporter = criarTransportadorEmail();

            await transporter.sendMail({
                from: process.env.SMTP_FROM,
                to: registro.email_pessoa,
                subject: 'Código de recuperação de senha | Kiko Milano',

                text: `Olá, ${registro.nome_pessoa}!

Seu código para recuperar a senha é: ${token}

Digite esse código na página de recuperação do site.

Ele expira em 30 minutos e só pode ser utilizado uma vez.

Se você não solicitou a recuperação, ignore este e-mail.`,

                html: `
                    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#30282a;background:#fffdfc;border:1px solid #eadbd7;border-radius:18px;text-align:center">
                        <h1 style="color:#9f5b67">Kiko Milano</h1>

                        <h2>Recuperação de senha</h2>

                        <p>Olá, ${nomeSeguro}!</p>

                        <p>Utilize o código abaixo para recuperar sua senha:</p>

                        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#9f5b67;padding:20px;background:#f8eeee;border-radius:12px">
                            ${token}
                        </div>

                        <p>O código expira em <strong>30 minutos</strong> e só pode ser utilizado uma vez.</p>

                        <p>Se você não solicitou a recuperação, ignore este e-mail.</p>
                    </div>
                `
            });
        }

        return res.json({
            status: 'ok',
            mensagem: 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.'
        });

    } catch (error) {
        console.error('Erro ao solicitar recuperação de senha:', error);

        return res.status(500).json({
            status: 'erro',
            mensagem: 'Não foi possível enviar o código. Verifique a configuração do e-mail.'
        });
    }
};


exports.abrirTelaRedefinirSenha = (req, res) => {
    res.sendFile(
        path.join(__dirname, '../../frontend/login/redefinir-senha.html')
    );
};


exports.validarTokenRecuperacao = async (req, res) => {
    const token = String(req.query.token || '').trim();

    if (!/^\d{6}$/.test(token)) {
        return res.json({ status: 'token_invalido' });
    }

    try {
        await garantirTabelaTokensRecuperacao();

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const result = await db.query(
            `SELECT 1
             FROM recuperacao_senha
             WHERE token_hash = $1
               AND expira_em > NOW()
             LIMIT 1`,
            [tokenHash]
        );

        return res.json({
            status: result.rows.length ? 'ok' : 'token_invalido'
        });

    } catch (error) {
        console.error('Erro ao validar código de recuperação:', error);

        return res.status(500).json({ status: 'erro' });
    }
};


exports.redefinirSenha = async (req, res) => {
    const token = String(req.body.token || '').trim();
    const senha = String(req.body.senha || '');

    if (!/^\d{6}$/.test(token)) {
        return res.status(400).json({
            status: 'token_invalido',
            mensagem: 'Informe o código de 6 números recebido por e-mail.'
        });
    }

    if (senha.length < 8) {
        return res.status(400).json({
            status: 'senha_fraca',
            mensagem: 'A senha deve ter pelo menos 8 caracteres.'
        });
    }

    try {
        await garantirTabelaTokensRecuperacao();

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        await db.transaction(async client => {
            const result = await client.query(
                `SELECT pessoa_cpf_pessoa
                 FROM recuperacao_senha
                 WHERE token_hash = $1
                   AND expira_em > NOW()
                 FOR UPDATE`,
                [tokenHash]
            );

            if (!result.rows.length) {
                const erro = new Error('TOKEN_INVALIDO');
                erro.code = 'TOKEN_INVALIDO';
                throw erro;
            }

            // Mantém compatibilidade com o formato de senha atual do login.
            await client.query(
                `UPDATE pessoa
                 SET senha_pessoa = $1
                 WHERE cpf_pessoa = $2`,
                [senha, result.rows[0].pessoa_cpf_pessoa]
            );

            // Apaga o código depois de utilizá-lo.
            await client.query(
                'DELETE FROM recuperacao_senha WHERE token_hash = $1',
                [tokenHash]
            );
        });

        return res.json({
            status: 'ok',
            mensagem: 'Senha alterada com sucesso! Faça login com sua nova senha.'
        });

    } catch (error) {
        if (error.code === 'TOKEN_INVALIDO') {
            return res.status(400).json({
                status: 'token_invalido',
                mensagem: 'Código incorreto, expirado ou já utilizado. Solicite outro.'
            });
        }

        console.error('Erro ao redefinir senha:', error);

        return res.status(500).json({
            status: 'erro',
            mensagem: 'Não foi possível alterar a senha.'
        });
    }
};
