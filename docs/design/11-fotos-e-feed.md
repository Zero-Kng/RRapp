# Seção 11 — Fotos no registro e feed da comunidade

> Parte do design do RR App. Status: **em revisão** desde 2026-09-27.
> Antecipa, antes das fatias 2 e 3 da Fase 2 ([Seção 10](10-fase2-colecoes.md)), duas coisas que o SDD deixava para depois: **fotos nas visitas** (antes um não-objetivo do MVP) e um **feed da comunidade** (o feed "de quem eu sigo" continua na Fase 3). Onde divergir das Seções [1](01-modelo-de-dados.md), [3](03-funcionalidades-e-fluxos.md), [4](04-api.md) e [5](05-frontend.md), vale esta seção.

## Objetivo

- Quem registra uma visita pode anexar **até 4 fotos** a ela.
- O **Início** mostra um **feed da comunidade**: as visitas mais recentes de todo mundo que tenham foto ou crítica, num visual que mistura **Instagram** (a foto como protagonista) e **Letterboxd** (restaurante, estrelas e crítica).

### Fora desta entrega

- Feed "de quem eu sigo" (Fase 3, como uma aba ao lado deste), curtidas e comentários
- Botão "Denunciar" (Fase 4); por enquanto a moderação é o dono apagando e o Admin removendo
- Uma tela para adicionar fotos a um registro antigo: nesta entrega as fotos entram ao registrar a visita (apagar é possível a qualquer momento). A API aceita envio para qualquer registro do dono, porque o "Tentar de novo" usa o mesmo endpoint; falta só a tela, que pode vir depois sem mudar o backend
- Reordenar fotos, legendas por foto, vídeos

## Modelo de dados

A foto pertence ao registro de visita, então a tabela nova fica no app **`registros`**.

| Tabela | Campos | Regras |
|---|---|---|
| **FotoRegistro** | `registro` (FK, cascata, `related_name="fotos"`), `imagem`, `miniatura`, `largura`, `altura`, `criada_em` | No máximo **4 por registro**; a ordem é a do envio (`criada_em`, `id`) |

### Tratamento de cada foto

No molde do avatar (`contas/avatares.py`):

- aceita **JPG, PNG, WebP e HEIC** (formato padrão do iPhone, via o pacote `pillow-heif`), com até **10 MB** e **40 megapixels**;
- confere o conteúdo real do arquivo (não a extensão) e barra "bombas de descompressão";
- corrige a rotação (EXIF) e **regrava do zero em WebP**, o que remove EXIF e GPS;
- gera **duas versões**: `imagem` (lado maior até **1.600 px**) e `miniatura` (lado maior até **480 px**);
- guarda `largura` e `altura` da versão grande, para a tela reservar o espaço antes de a imagem chegar;
- nomes aleatórios, em `fotos/` no armazenamento padrão (pasta `media/` em desenvolvimento; Cloudflare R2 no deploy, configurado junto com o avatar).

### Apagar

- Apagar uma foto apaga os dois arquivos do armazenamento.
- Apagar o registro ou excluir a conta apaga todas as fotos e os arquivos (decisão D13).
- No Admin, as fotos aparecem em miniatura dentro do registro, e qualquer uma pode ser apagada.

## API

Tudo sob `/api/v1`, no formato de erro de sempre.

### Fotos

```
POST   /registros/{id}/fotos                multipart, campo "imagem" → 201 com a foto
DELETE /registros/{id}/fotos/{foto_id}      → 204
```

- Só o dono do registro envia e apaga.
- Limite próprio de envio: **60 fotos por hora** por usuário (escopo `fotos`), separado das escritas comuns (30 por minuto).
- A foto devolvida tem `id`, `imagem`, `miniatura`, `largura` e `altura`.

### Registros com fotos

O `RegistroSerializer`, usado no diário, nas críticas, na página do restaurante e no feed, ganha `fotos`: a lista das fotos na ordem do envio.

### Feed da comunidade

```
GET    /feed?cursor=                        → 20 registros por vez
```

- Entram registros **com crítica ou com pelo menos uma foto**, de usuários ativos.
- Ordem: **hora da postagem** (`criado_em`), da mais recente para a mais antiga. Não é a data da visita: uma visita de março registrada hoje é novidade hoje.
- **Paginação por cursor** (como a Seção 4 define para o feed): registros novos não fazem itens se repetirem nem pularem ao rolar.
- **Público**: anônimos também veem.

### Página do restaurante e perfil

- A lista de registros da página do restaurante passa a incluir os que têm **só foto**, além dos que têm crítica.
- A aba **Críticas** do perfil continua só com registros que têm texto.

## Permissões

| Ação | Anônimo | Outro usuário | Dono |
|---|---|---|---|
| Ver fotos e o feed | ✅ | ✅ | ✅ |
| Enviar foto a um registro | 401 | 403 | ✅ |
| Apagar foto | 401 | 403 | ✅ |

- Usuário suspenso (`is_active=False`): seus registros e fotos somem do feed, como já somem do diário.
- Registro inexistente, ou foto que não é daquele registro: 404.

### Erros de validação

No campo `imagem`:

- "Envie uma imagem JPG, PNG, WebP ou HEIC."
- "A imagem deve ter no máximo 10 MB."
- "A imagem é grande demais (dimensões)."
- "Cada visita pode ter até 4 fotos."

Limite de envios estourado: `429`, com a mensagem padrão de limite.

## Telas

### Início

- Busca no topo e, embaixo, o **feed da comunidade**. "Suas últimas visitas" sai do Início (já está no Perfil > Diário). Substitui a decisão D20.
- Anônimo: a apresentação com "Criar conta" e, abaixo, o mesmo feed.
- O feed carrega mais itens ao chegar perto do fim, com o botão **"Carregar mais"** de reserva. Estados vazio, erro e carregando.

### Item do feed com foto (estilo "pôster")

- Topo: foto de perfil, nome e há quanto tempo foi postado (link para o perfil).
- A **primeira foto ocupa a largura toda**, no formato dela, limitado entre retrato **4:5** e paisagem **16:9** (recorte central).
- Sobre a parte de baixo da foto, num degradê escuro: **restaurante** (link), **estrelas douradas**, bairro e ♥ se a pessoa curtiu.
- Com mais de uma foto: deslizar para o lado entre elas, com o contador "1/3".
- Embaixo da foto, a crítica (se houver), cortada em **3 linhas** com "ver mais".

### Item do feed sem foto (crítica como pôster)

- No lugar da foto, a **crítica em letras grandes** sobre o degradê azul do app, com restaurante, estrelas e bairro embaixo. Crítica longa é cortada com "ver mais".

### Tela cheia

- Tocar numa foto (no feed, no diário ou na página do restaurante) abre a foto grande numa tela cheia (diálogo Radix), deslizando entre as fotos do registro.
- No registro que é seu, a tela cheia tem **"Apagar esta foto"**, com confirmação.

### Registrar visita

- Campo **"Fotos (até 4)"**: abre a galeria ou a câmera do celular, mostra miniaturas com ✕ para tirar e confere formato e tamanho antes de enviar.
- Ao salvar: o registro é criado e as fotos sobem **uma por vez**, com "Enviando fotos… 1 de 2". Se uma falhar, o registro já está salvo e aparece **"Tentar de novo"** para aquela foto, sem refazer o resto.

### Diário e página do restaurante

- Cada registro com fotos mostra as **miniaturas** numa linha; tocar abre a tela cheia.

### Temas

- O azul do pôster e as estrelas douradas funcionam nos temas claro e escuro. O texto sobre fotos depende do degradê escuro para manter contraste AA.

## Testes

- **Backend (TDD)**: processamento (cada formato aceito, cada limite, EXIF/GPS removidos, duas versões e dimensões certas), limite de 4, matriz de permissões, arquivos apagados com a foto, o registro e a conta, e o feed (quem entra, ordem, cursor estável, suspensos fora, número fixo de consultas).
- **Frontend (Vitest + MSW)**: item com foto e pôster, deslizar entre as fotos, tela cheia com "Apagar esta foto", envio com progresso e "Tentar de novo", Início anônimo e logado, estados vazio, erro e carregando.
- **Ponta a ponta**: registrar uma visita **com foto** e ver o item no feed do Início; em 375 px, as telas não rolam na horizontal.

## Entrega

Duas fatias, nesta ordem, cada uma com backend, frontend, testes e um PR próprio:

1. **Fotos no registro**: a tabela, o upload e o tratamento, o campo no "Registrar visita", as miniaturas no diário e na página do restaurante, e a tela cheia com "Apagar".
2. **Feed da comunidade**: `GET /feed`, o Início novo, os itens em estilo pôster e a crítica como pôster.

Cada fatia tem o próprio plano, escrito logo antes dela. Antes de cada PR: teste de ponta a ponta, conferência manual no celular (375 px, claro e escuro) e revisão do branch por um revisor novo. Depois vêm as fatias 2 (Favoritos) e 3 (Listas) da Fase 2.
