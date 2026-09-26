# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pessoas no Rio de Janeiro que saem para comer e querem guardar e compartilhar o que acharam dos lugares. No MVP, amigos e conhecidos convidados para validar a ideia. Usam principalmente pelo celular, logo depois de uma refeição ou planejando a próxima.

## Product Purpose

Um diário pessoal de restaurantes: registrar cada visita, dar nota de 0 a 5 estrelas em meias estrelas e escrever críticas. Depois vira rede social (listas compartilháveis, lista de desejos, seguir pessoas, feed). Sucesso no MVP: os testadores conseguem se cadastrar, achar restaurantes do Rio, registrar visitas e seguir uns aos outros sem ajuda.

## Positioning

Foco no gosto pessoal e na curadoria entre amigos, no espírito do Letterboxd, e não em guia comercial ou ranking público tipo TripAdvisor/Yelp. A nota média de um restaurante considera só a nota mais recente de cada pessoa.

## Operating Context

Web responsivo primeiro, com app mobile nativo no futuro consumindo a mesma API. A base de restaurantes vem de dados abertos (Foursquare OS Places), com cerca de 38 mil restaurantes no Rio, e é moderada pelo painel Admin.

## Capabilities and Constraints

- Fase 1: cadastro/login, busca, página do restaurante, registro de visita (nota + crítica), perfil com diário e críticas, configurações.
- Fases seguintes: desejos, listas, favoritos (3 no perfil), seguir, feed, curtidas, comentários, sugerir restaurante, denúncias.
- LGPD: aceite de termos no cadastro, exclusão completa da conta pelo próprio usuário.
- Termos: "registro" (uma visita no diário), "crítica" (texto do registro), "nota" (0 a 5, meias estrelas).

## Brand Commitments

Nome provisório: rrapp. Identidade visual aprovada em `docs/design/09-frontend-fase1.md`.

## Evidence on Hand

Não há depoimentos, números de uso ou imagens de restaurantes; não inventar. A base não tem fotos nem faixa de preço para a maioria dos lugares, e 34% não têm endereço.

## Product Principles

- O diário pessoal tem valor sozinho; o social vem por cima.
- Registrar uma visita precisa ser rápido no celular.
- A nota é o elemento mais importante da tela.
- Honestidade com os dados: mostrar o que falta (sem avaliações, sem endereço) em vez de esconder.

## Accessibility & Inclusion

WCAG AA: contraste 4,5:1 para texto e 3:1 para ícones informativos; tudo operável por teclado; estrelas com rótulo para leitor de tela.
