# Seção 3 — Funcionalidades e fluxos

> Parte do design do RR App. Status: **aprovada** em 2026-09-25.

## Telas principais

### 🏠 Início (Feed)

- **Usuário que segue pessoas**: registros e listas recentes de quem ele segue, em ordem cronológica.
- **Usuário novo** (ainda não segue ninguém): "Populares esta semana" no Rio (restaurantes e críticas mais curtidos) e sugestões de pessoas para seguir. O app nunca abre vazio.

### 🔍 Buscar / Explorar

- Busca por nome, ignorando acentos
- Filtros: **bairro**, **categoria**, **faixa de preço**, **nota mínima**
- Ordenação: mais bem avaliados, mais populares, mais recentes
- Botão "Não encontrou? Sugerir restaurante" no fim dos resultados

### 🍽️ Página do restaurante

- Nome, endereço, bairro, categorias, preço e link para abrir no mapa
- **Nota média** e **histograma de notas** (distribuição de 0,5★ a 5★, como no Letterboxd)
- "Amigos que foram": notas de quem o usuário segue
- Críticas mais curtidas
- Ações: **Registrar visita**, **♡ Desejo**, **+ Adicionar a lista**, **Marcar como fechado**

### ✍️ Registrar visita

Modal pensado para ser rápido no celular.

- Data da visita (padrão: hoje)
- Nota em meias estrelas (opcional, tocando nas estrelas)
- ♥ Curtiu
- Crítica (opcional, até 5.000 caracteres)
- "Já tinha ido antes"

**Regras**

- Ao salvar, o restaurante sai automaticamente da lista de desejos.
- O usuário pode editar e apagar os próprios registros.

### 👤 Perfil

- Avatar, nome, bio, cidade e os **3 favoritos** no topo
- Números: restaurantes visitados, visitados este ano, seguidores, seguindo
- Abas: **Diário** (agrupado por mês), **Críticas**, **Listas**, **Desejos**, **Seguidores/Seguindo**
- Botão **Seguir** no perfil de outras pessoas
- Tela de edição: avatar, bio, nome, cidade e escolha dos 3 favoritos

### 📋 Listas

- Criar lista com título, descrição, ranqueada ou não, pública ou privada
- Adicionar restaurantes (pela busca ou pela página do restaurante), reordenar e escrever uma nota por item
- Listas públicas podem ser curtidas e comentadas
- Página "Listas populares" para descobrir listas da comunidade

### ♡ Desejos

- Lista simples, pública no perfil (como a watchlist do Letterboxd)
- Ordenável por data ou bairro

## Regras sociais

- Seguir é **unilateral e sem aprovação** (como no Letterboxd e no Twitter). Não há perfil privado no MVP.
- É possível curtir e comentar **registros com crítica** e **listas públicas**.
- O usuário pode apagar os próprios comentários e os comentários feitos nos seus registros ou listas.

## Ordem de entrega (fases do MVP)

| Fase | Entrega | Resultado |
|---|---|---|
| **0** | Teste dos dados abertos e importação do Rio | Base de restaurantes pronta |
| **1** | Cadastro/login, busca, página do restaurante, registrar visita com nota, perfil básico com diário | **Já dá para usar sozinho**, como um diário |
| **2** | Desejos, listas, favoritos | Organização pessoal completa |
| **3** | Seguir, feed, curtidas, comentários | **Vira rede social** |
| **4** | Sugerir e marcar como fechado, denúncias, "Populares", histograma, exportar dados, polimento | Pronto para convidar os testadores |

A infraestrutura de segurança (JWT, permissões, cabeçalhos, CI de segurança) é construída **junto com a Fase 1**, e não depois.

Cada fase termina com algo **funcionando e utilizável**. Se o desenvolvimento parar em qualquer ponto, o que já existe tem valor por si só.
