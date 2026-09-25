# Seção 7 — Segurança

> Parte do design do RR App. Status: **aprovada** em 2026-09-25.
> Organizada por **ameaça → defesa**, tendo como guia o **OWASP Top 10** (lista das falhas de segurança mais comuns em aplicações web).

## 1. Controle de acesso

É a falha nº 1 do OWASP.

- **As permissões ficam sempre no backend.** Cada endpoint declara quem pode acessar: público, usuário logado ou somente o dono.
- **IDOR** (acessar dados alheios trocando um ID na URL):
  - Uma **lista privada** retorna `404` para quem não é o dono (e não `403`, para não revelar que ela existe).
  - `PATCH /registros/42` confere se o registro 42 pertence ao usuário.
- **Dados sensíveis nunca saem na API**: e-mail de outros usuários, datas de login e status de staff não aparecem em respostas públicas. Serializers separados para "meu perfil" e "perfil público".
- **Testes automáticos de permissão** para cada endpoint (ver [Seção 8](08-testes-e-deploy.md)).

## 2. Autenticação e contas

- **Rotação de tokens**: cada uso do token de renovação gera um novo token, e o antigo vai para uma **lista negra**. Um token antigo roubado deixa de funcionar.
- **CSRF**: o cookie do token de renovação usa `SameSite=Strict`, e o endpoint de renovação exige cabeçalho de proteção CSRF.
- **Senhas**: hash com **Argon2** (suportado pelo Django). Mínimo de 8 caracteres, bloqueio de senhas comuns e de senhas parecidas com o username.
- **Sem enumeração de contas**:
  - O login responde "e-mail ou senha incorretos", sem dizer qual dos dois está errado.
  - "Esqueci minha senha" sempre responde "se o e-mail existir, enviaremos um link".
- **Link de redefinição de senha**: expira em 1 hora e só pode ser usado uma vez.
- **Trocar a senha** encerra todas as outras sessões (invalida os tokens de renovação).
- **2FA para usuários comuns**: fora do MVP. Entra como opcional na fase de produto.

## 3. Painel Admin

É a porta mais valiosa do sistema.

- A URL **não é `/admin/`**: o caminho é definido por variável de ambiente, o que evita robôs que varrem `/admin`.
- **Autenticação em dois fatores (2FA) obrigatória** para staff, via `django-otp` (app autenticador).
- Apenas contas staff têm acesso, com **permissões mínimas**: um moderador aprova restaurantes e denúncias, mas não altera usuários.
- **Registro de auditoria**: quem aprovou, editou ou apagou o quê, e quando (recurso nativo do Django).

## 4. Injeção e XSS

- **SQL injection**: o ORM do Django gera consultas parametrizadas. Regra do projeto: **nada de SQL cru** montado com texto do usuário.
- **XSS**: conteúdo do usuário é texto puro, e o React escapa tudo por padrão. Regra do projeto: **proibido `dangerouslySetInnerHTML`** com conteúdo de usuário.
- **Cabeçalhos de segurança HTTP**:
  - `Content-Security-Policy`: o navegador só executa scripts do próprio domínio
  - `Strict-Transport-Security` (HSTS): força HTTPS
  - `X-Frame-Options: DENY`: impede que o site seja embutido em outro, contra clickjacking
  - `X-Content-Type-Options` e `Referrer-Policy`

## 5. Uploads (avatar)

- Validação do **conteúdo real** do arquivo, e não só da extensão: a imagem é aberta com o Pillow e rejeitada se não for imagem.
- Limite de 2 MB. A imagem é redimensionada, **regravada do zero** (elimina conteúdo malicioso embutido) e tem os **dados EXIF/GPS removidos**.
- O nome do arquivo é gerado aleatoriamente e nunca vem do usuário.
- Os arquivos ficam em **armazenamento de objetos** (S3/R2), fora do servidor da aplicação, e nunca são executados.

## 6. Abuso e spam

- **Limites de requisições (throttling)**:

  | Ação | Limite |
  |---|---|
  | Login | 5 tentativas/min por IP |
  | Cadastro | 3/hora por IP |
  | Comentários e registros | 30/min por usuário |
  | Sugerir restaurante | 10/dia por usuário |

- **Denunciar** críticas, comentários, listas e perfis. As denúncias vão para uma fila no Admin.
- Moderadores podem **suspender contas**.
- **Limites de tamanho** em todos os textos: crítica 5.000, comentário 1.000, bio 300, título de lista 100 caracteres.

## 7. Segredos e configuração

- Todos os segredos (`SECRET_KEY`, senha do banco, chaves de API) ficam em **variáveis de ambiente**. Um `.env.example` sem valores reais é versionado, e o `.env` real fica no `.gitignore`.
- `DEBUG=False` em produção. **`manage.py check --deploy`** roda antes de cada deploy.
- **Scanner de segredos** (gitleaks) no CI, que bloqueia commits com chaves por engano.

## 8. Dependências

- **Dependabot** no GitHub, que abre PRs automáticos quando uma biblioteca tem vulnerabilidade conhecida
- `pip-audit` e `npm audit` no CI
- **Bandit** (analisador de segurança de código Python) no CI
- Versões fixadas em arquivos de lock, para builds reproduzíveis

## 9. Banco de dados

- O usuário do banco usado pela aplicação **não é administrador**: não apaga tabelas nem cria usuários.
- **Backups diários automáticos** e criptografados, com **teste de restauração mensal**.
- O banco não fica exposto à internet; apenas a aplicação o acessa.

## 10. Logs e privacidade

- Os **logs nunca contêm** senhas, tokens ou cookies. O Sentry é configurado para mascarar esses campos.
- Os logs registram eventos de segurança: logins que falharam, bloqueios por limite, ações no Admin, trocas de senha.

## 11. LGPD

- **Política de privacidade** e **termos de uso** aceitos no cadastro, com registro de data e versão aceita.
- **Minimização de dados**: só o necessário (sem CPF, telefone ou localização contínua).
- **Excluir conta** apaga todos os dados do usuário.
- **Exportar meus dados** em JSON/CSV.
- **E-mail de contato** para questões de privacidade (encarregado exigido pela lei).

## 12. Resposta a incidentes

Checklist curto em `docs/seguranca/incidentes.md`:

1. Rotacionar segredos (`SECRET_KEY`, chaves de API, senha do banco)
2. Invalidar todos os tokens, forçando novo login de todos os usuários
3. Investigar pelos logs e pelo Sentry
4. Se dados pessoais vazarem: **comunicar a ANPD e os titulares afetados**, conforme exigido pela LGPD
