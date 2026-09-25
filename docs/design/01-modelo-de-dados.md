# Seção 1 — Modelo de dados

> Parte do design do RR App (app social de reviews de restaurantes, inspirado no Letterboxd).
> Status: **aprovada** em 2026-09-25.

## Visão geral das entidades

```
                     ┌──────────┐
                     │  Cidade  │  (Rio de Janeiro, RJ …)
                     └────┬─────┘
                          │ 1:N
┌──────────┐        ┌─────┴───────┐
│ Usuário  │───N:N──│ Restaurante │
└──┬───────┘        └─────────────┘
   │  (via Registro, Desejo, Lista, Favorito)
   │
   ├── Registro (diário + nota + crítica) ──► Curtidas, Comentários
   ├── Desejo (lista de desejos)
   ├── Lista ──► ItemLista ──► Restaurante ──► Curtidas, Comentários
   ├── Favorito (top 3 do perfil)
   └── Segue (usuário → usuário)
```

## Entidades

### 1. Usuário

Modelo de usuário **customizado desde o primeiro dia**, porque trocar o modelo de usuário do Django depois é muito trabalhoso.

- `username`, `email`, `senha` (fornecidos pelo Django)
- `nome_exibicao`, `bio`, `avatar`, `cidade` (FK → Cidade)

**Favorito**: até **3** restaurantes exibidos no topo do perfil.

- `usuário`, `restaurante`, `posição` (1 a 3)
- Unicidade: (`usuário`, `posição`) e (`usuário`, `restaurante`)

### 2. Cidade

- `nome`, `estado` (UF), `slug` (ex.: `rio-de-janeiro`)
- Existe desde o MVP para que a expansão para outras cidades seja apenas cadastrar novas linhas, sem migração de dados.

### 3. Restaurante

Base híbrida (ver [Seção 2](02-integracao-restaurantes.md)).

- `fonte` + `id_externo`: origem do dado (ex.: `fsq_os` / `4b8c…`), únicos em conjunto para impedir que o mesmo lugar seja salvo duas vezes. Ficam vazios em restaurantes sugeridos por usuários.
- `slug`, `nome`, `endereço`, `bairro`, `cidade` (FK), `latitude`, `longitude`
- `categorias` (Japonês, Boteco, Pizzaria…), `faixa_preço` (1 a 4, exibida como $ a $$$$)
- `status`: `ativo`, `pendente` (sugestão aguardando moderação) ou `fechado`
- `sugerido_por` (FK → Usuário, opcional)
- `nota_media` e `total_avaliacoes`: valores pré-calculados, para que a busca não recalcule a cada acesso

### 4. Registro (diário + avaliação)

Peça central do app: une **diário e avaliação** em uma única entidade, como no Letterboxd.

- `usuário`, `restaurante`, `data_visita`
- `nota` (opcional): **meias estrelas**, de 0 a 5 em passos de 0,5. No banco é guardada como **inteiro de 0 a 10**, o que evita erros de arredondamento com decimais.
- `crítica` (texto opcional, até 5.000 caracteres)
- `curtiu` (♥), `revisita` (sim/não)
- `criado_em`, `atualizado_em`

**Regras**

- Uma visita ao diário *pode* ter nota e crítica, mas nenhuma das duas é obrigatória. Assim a nota não fica duplicada em dois lugares.
- Três visitas ao mesmo restaurante geram três registros.
- A **média do restaurante considera apenas a nota mais recente de cada usuário**. Quem foi dez vezes não tem peso dez.

### 5. Desejo (lista de desejos)

- `usuário`, `restaurante`, `adicionado_em`
- Unicidade: um registro por par (`usuário`, `restaurante`)
- É removido automaticamente quando o usuário registra uma visita ao restaurante.

### 6. Lista (listas da comunidade)

- `dono`, `slug`, `título`, `descrição`, `ranqueada` (numerada ou não), `pública` (sim/não)

**ItemLista**

- `lista`, `restaurante`, `posição`, `nota_do_item` (ex.: "peça o polvo")

### 7. Social

- **Segue**: `seguidor` → `seguido` (unicidade no par; um usuário não pode seguir a si mesmo)
- **Curtidas**: `CurtidaRegistro` e `CurtidaLista`
- **Comentários**: `ComentarioRegistro` e `ComentarioLista`

- **Denúncia**: `autor`, tipo e id do alvo (registro, comentário, lista ou perfil), `motivo`, `status` (fila de moderação no Admin; ver [Seção 7](07-seguranca.md))

Usamos **tabelas explícitas**, e não uma tabela "genérica", porque são mais simples de entender e consultar e mantêm a integridade dos dados.

**Feed**: não tem tabela própria no MVP. É uma consulta: "registros e listas recentes de quem eu sigo". Uma tabela de atividades só compensa com muitos usuários e é uma evolução natural para a fase de produto.

## Fora do MVP (de propósito)

- Fotos em críticas (custo de armazenamento e de moderação; pode entrar na fase 2)
- Notificações, mensagens diretas, bloqueio de usuários, tags personalizadas
