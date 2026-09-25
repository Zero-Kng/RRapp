# Fase 0 — Resultados da base de restaurantes

> Executado em 2026-09-25 com a release `dt=2026-09-15` da FSQ Open Source Places.
> Mapa de bairros: camada "Limite de Bairros" da Prefeitura do Rio publicada pela SMS no ArcGIS (144 bairros, WGS84). O servidor oficial `pgeo3.rio.rj.gov.br` estava fora do ar (HTTP 500).

## Números

| Métrica | Valor |
|---|---|
| Extraídos (caixa do Rio, "Dining and Drinking") | 58.757 |
| Criados | 38.091 |
| Fora do município (Niterói, Baixada etc.) | 15.018 |
| Já fechados (ignorados) | 5.648 |
| **Total ativo no Rio** | **38.091** |
| Sem bairro | 0 |
| Sem endereço | 12.915 (34%) |
| Categorias distintas | 180 (todas em inglês) |
| Grupos de nome + bairro repetidos | 1.089 grupos, 2.830 restaurantes |
| Tempo de importação | ~8 min |
| Reimportação | 0 criados, 38.091 atualizados (idempotente ✅) |

A extração leu os Parquets direto do Hugging Face, sem baixar os 11,6 GB.

## Top bairros

| Bairro | Restaurantes |
|---|---|
| Centro | 3.500 |
| Barra da Tijuca | 3.096 |
| Copacabana | 2.209 |
| Botafogo | 1.824 |
| Campo Grande | 1.754 |
| Tijuca | 1.476 |
| Recreio dos Bandeirantes | 1.061 |
| Jacarepaguá | 985 |
| Ipanema | 975 |
| Leblon | 746 |

## Top categorias

Restaurant (4.732), Bar (4.408), Brazilian Restaurant (3.129), Snack Place (1.957), Pizzeria (1.897), Café (1.694), Bakery (1.685), Burger Joint (1.655), Food Truck (1.605), Fast Food Restaurant (1.043).

## Amostra manual

Lista de 20 restaurantes variados (14 bairros, de botecos a estrelados Michelin), fornecida pelo usuário.

| Restaurante | Encontrado? | Bairro correto? |
|---|---|---|
| Miam Miam | ✅ | ✅ Botafogo |
| Aprazível | ✅ | ✅ Santa Teresa |
| Pescados na Brasa | ✅ | ⚠️ Sampaio (esperado Riachuelo, bairros vizinhos: divisão antiga do mapa) |
| Aconchego Carioca | ✅ | ✅ Praça da Bandeira |
| Churrascaria Palace | ✅ | ✅ Copacabana |
| Galeto Sat's | ✅ | ✅ Botafogo e Copacabana |
| Mocellin Steak | ❌ (a marca aparece: Mocellin Mar, Mocellin Churrascaria) | — |
| Babbo Osteria | ✅ | ✅ Ipanema |
| Casa do Sardo | ✅ ("Ristorante Casa do Sardo") | ✅ São Cristóvão |
| Ferro e Farinha | ✅ | ✅ Botafogo, Barra, Leblon |
| Haru Ichiban | ❌ (só "Haru Sushi Bar", Copacabana) | — |
| Toto | ✅ | ✅ Ipanema |
| Satyricon | ✅ | ✅ Ipanema |
| Adega do Pimenta | ✅ | ✅ Santa Teresa |
| Rio Minho | ✅ | ✅ Centro |
| Oro | ❌ | — |
| Lasai | ✅ | ✅ Botafogo |
| Oteque | ✅ | ✅ Botafogo |
| Adega Pérola | ✅ | ✅ Copacabana |
| Armazém São Thiago | ✅ | ✅ Santa Teresa |

**Encontrados: 17/20. Bairro correto: 16/17 (94%).**

## Critérios de go/no-go

- [x] ≥ 2.000 restaurantes ativos no Rio (**38.091**)
- [x] ≥ 15 dos 20 restaurantes da amostra encontrados (**17**)
- [x] ≥ 90% dos encontrados com bairro correto (**94%**)

## Decisão

**GO.** A base cobre bem a cidade inteira, da Zona Sul à Zona Oeste, inclusive casas pequenas da Zona Norte (Pescados na Brasa, Casa do Sardo) e os estrelados Michelin (Lasai, Oteque). As lacunas (Oro, Haru Ichiban, Mocellin Steak) são exatamente o caso previsto para o botão "Sugerir restaurante" da Fase 4.

## Observações e pendências

- **Duplicatas:** 1.089 grupos com o mesmo nome no mesmo bairro (ex.: "Coro Come" três vezes, "Mocellin Mar" duas; "Lasai" em Botafogo e Humaitá). Precisam de uma ferramenta de mesclagem no Admin ou de uma deduplicação por proximidade antes de abrir para os testadores.
- **Lugares desatualizados:** a base aberta mantém lugares que podem já ter fechado sem `date_closed`. As marcações "fechou" dos usuários (Fase 4) resolvem com o tempo. Vale considerar filtrar por `date_refreshed` recente numa próxima importação.
- **Categorias em inglês:** 180 categorias a traduzir na lista editável do Admin.
- **34% sem endereço:** a página do restaurante deve funcionar só com nome, bairro e coordenadas (link para o mapa).
- **Escopo amplo:** "Dining and Drinking" inclui food trucks, padarias e lanchonetes. Decidir se esses entram na busca ou ficam com peso menor.
- **Mapa de bairros antigo:** 144 bairros, contra cerca de 165 hoje. Trocar pelo arquivo oficial quando o servidor da prefeitura voltar e reimportar (a reimportação preserva slugs).
