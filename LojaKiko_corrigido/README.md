# Loja Kiko — 4º bimestre

## Como executar

1. Instale o Node.js e o PostgreSQL.
2. Crie um banco PostgreSQL vazio. O script `documentacao/scriptsql.sql` recria as tabelas e começa com comandos `DROP TABLE`; use-o somente em um banco novo/de teste, pois ele apaga tabelas e dados existentes.
3. Copie `.env.example` para `.env` e preencha com suas próprias credenciais:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nome_do_banco
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
PORT=3001
NODE_ENV=development
```

4. No terminal, dentro da pasta do projeto, execute `npm install`.
5. Inicie com `node backend/server.js`.
6. Ou execute `npm start`.
7. Acesse `http://localhost:3001` para abrir a vitrine.

> O arquivo `.env` não é incluído neste pacote por segurança. Use as credenciais do seu PostgreSQL local.
