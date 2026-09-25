# Seção 5 — Frontend (React)

> Parte do design do RR App. Status: **aprovada** em 2026-09-25.

## Ferramentas

| Peça | Escolha | Por quê |
|---|---|---|
| Linguagem | **TypeScript** | JavaScript com tipos. Os tipos são **gerados automaticamente a partir da API do Django** (OpenAPI), então mudanças no backend aparecem como erro no editor antes de chegarem à produção. É o padrão de mercado com React e React Native. |
| Base | **React + Vite** | Desenvolvimento rápido; é o padrão atual para criar projetos React. |
| Rotas | **React Router** | Controla as URLs das telas. |
| Dados da API | **TanStack Query** | Cache, estados de carregamento e erro, recarregamento. Dispensa `useEffect` + `useState` + tratamento de erro repetidos em cada tela. |
| Estilo | **Tailwind CSS** | Classes utilitárias, *mobile-first*, responsividade simples (`md:`, `lg:`). |
| Formulários | **React Hook Form + Zod** | Validação no cliente com as mesmas regras do backend (nota em meias estrelas, crítica de até 5.000 caracteres). |
| PWA | **vite-plugin-pwa** | Permite "instalar" o site na tela inicial do celular, com ícone de app. É o primeiro passo antes do app nativo. |

## Estrutura de pastas (por funcionalidade)

```
frontend/src/
├── api/              → cliente HTTP, tipos gerados da API
├── components/       → peças reutilizáveis (Botão, Modal, Avatar, EstrelasNota)
├── features/
│   ├── auth/         → login, cadastro
│   ├── restaurantes/ → busca, página do restaurante
│   ├── registros/    → modal de registrar, cartão de crítica
│   ├── perfil/       → perfil, diário, edição
│   ├── listas/       → criar, editar, ver listas
│   ├── desejos/
│   └── social/       → feed, seguir, curtir, comentários
├── pages/            → telas, montadas a partir das features
└── App.tsx           → rotas
```

Na organização **por funcionalidade**, tudo sobre listas fica em `features/listas/`, o que facilita encontrar o código. No futuro, a lógica de cada feature (hooks, chamadas à API) pode ser reaproveitada quase inteira no React Native.

## Rotas

```
/                     Início (feed ou populares)
/buscar               Busca e filtros
/r/:slug              Página do restaurante
/u/:username          Perfil (abas: diário, críticas, listas, desejos)
/l/:slug              Página de uma lista
/listas               Listas populares
/entrar               Login
/cadastro             Cadastro
/configuracoes        Editar perfil
```

## Componente de destaque: `EstrelasNota`

É o componente mais importante do app.

- 5 estrelas; **tocar na metade esquerda** de uma estrela dá meia estrela
- Arrastar o dedo sobre as estrelas ajusta a nota
- Tocar de novo na nota atual **limpa** a nota (ela é opcional)
- Acessível: ajustável pelas setas do teclado, e leitores de tela anunciam "3,5 de 5 estrelas"

## Layout responsivo

- **Celular** (prioridade): barra de navegação fixa **embaixo** (Início, Buscar, **+ Registrar**, Listas, Perfil), como num app nativo
- **Desktop**: a navegação passa para o topo e o conteúdo ganha colunas laterais (ex.: na página do restaurante, o histograma fica ao lado das críticas)
