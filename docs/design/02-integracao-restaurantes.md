# Seção 2 — Integração com dados de restaurantes

> Parte do design do RR App. Status: **aprovada** em 2026-09-25.

## Contexto

A opção escolhida foi uma base **híbrida**: dados externos combinados com um banco próprio que cresce com o uso. O lançamento é focado no **Rio de Janeiro**, com expansão futura para outras cidades e estados.

## Problema identificado

Os termos de uso do **Google Places** **não permitem armazenar** nome, endereço e outros dados no banco próprio. Apenas o `place_id` pode ser guardado. Além disso, cada busca é cobrada. Por isso, o modelo "buscar na API e salvar no nosso banco" violaria os termos justamente da API mais conhecida.

## Solução adotada

### 1. Semear o banco com dados abertos

A Foursquare publicou a base **FSQ Open Source Places** sob licença aberta (Apache 2.0), que **permite armazenar e usar os dados**. Um script de importação carrega os restaurantes do Rio de Janeiro no PostgreSQL. Para abrir uma nova cidade, basta rodar o mesmo script para ela.

### 2. A busca acontece no nosso banco

Usamos a busca textual do PostgreSQL, que é rápida e gratuita, não depende de API externa e ignora acentos ("feijoada" encontra "Feijoáda").

### 3. Os usuários completam a base

- **"Sugerir restaurante"**: quando um lugar não é encontrado, o usuário pode sugeri-lo. A sugestão entra com status `pendente` e é aprovada no painel Admin do Django.
- **"Marcar como fechado"**: os usuários sinalizam lugares que fecharam, e a moderação confirma.

### 4. APIs pagas só no futuro e sob demanda

Na fase de produto, o Google poderá ser usado apenas para **exibir** fotos e horários em tempo real, sem armazenamento, dentro dos termos de uso.

## Vantagens

- Custo zero no MVP
- A base é realmente do projeto
- Busca rápida
- Expansão por cidade repetível (mesmo script)

## Riscos e mitigação

| Risco | Mitigação |
|---|---|
| A base aberta pode conter restaurantes fechados ou categorias imprecisas | Marcações "fechou" dos usuários e moderação no Admin |
| Cobertura e formato da base no Rio ainda não confirmados | **Primeira tarefa do plano**: um teste rápido para validar cobertura e formato antes de construir em cima |

## Impacto no modelo de dados

O Restaurante ganha os campos:

- `status`: `ativo`, `pendente` ou `fechado`
- `sugerido_por`: FK opcional para Usuário
