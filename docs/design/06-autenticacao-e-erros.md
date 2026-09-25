# Seção 6 — Autenticação e tratamento de erros

> Parte do design do RR App. Status: **aprovada** em 2026-09-25.
> As regras de segurança detalhadas estão na [Seção 7 — Segurança](07-seguranca.md).

## Autenticação

### Mecanismo: tokens JWT

Biblioteca: `djangorestframework-simplejwt`.

Tokens foram escolhidos em vez de sessões do Django porque **o mesmo mecanismo funciona no web e no mobile**. Com sessões, o projeto teria dois sistemas de login quando o app nativo chegar.

- **Token de acesso**: dura **15 minutos** e é enviado em cada requisição.
- **Token de renovação**: dura **30 dias** e gera um novo token de acesso sem pedir a senha de novo.

### Onde cada token é guardado

| | Token de acesso | Token de renovação |
|---|---|---|
| **Web** | Somente na memória do JavaScript | **Cookie `httpOnly` + `Secure`**, inacessível ao JavaScript (proteção contra roubo por XSS) |
| **Mobile (futuro)** | Memória | Armazenamento seguro do sistema (Keychain/Keystore) |

### Fluxos no MVP

- Cadastro com **e-mail + username + senha**, com aceite da política de privacidade e dos termos de uso
- Login com e-mail ou username
- **"Esqueci minha senha"** por link enviado por e-mail (serviço transacional com plano gratuito, como Resend ou Brevo)
- Logout, que invalida o token de renovação
- **Excluir conta**: **apaga todos os dados** do usuário (registros, críticas, listas, comentários, curtidas). Decisão tomada por ser mais simples e mais segura perante a LGPD.

### Fora do MVP

- "Entrar com Google/Apple"
- Confirmação obrigatória de e-mail

Com testadores conhecidos, esses fluxos só adicionariam atrito. Os dois entram na fase de produto.

## Tratamento de erros

### Formato padrão de erro na API

Sempre o mesmo formato, o que facilita o frontend web e o mobile:

```json
{
  "erro": {
    "codigo": "nota_invalida",
    "mensagem": "A nota deve ser entre 0 e 5, em passos de 0,5.",
    "campos": { "nota": ["Valor 3.7 não permitido."] }
  }
}
```

### Códigos HTTP

| Código | Significado |
|---|---|
| `400` | Dados inválidos |
| `401` | Não autenticado |
| `403` | Sem permissão |
| `404` | Recurso não existe |
| `429` | Muitas requisições (limite atingido) |
| `500` | Erro interno do servidor |

### No frontend

- Erros de campo aparecem **embaixo do campo** no formulário
- Erros gerais aparecem como aviso temporário (*toast*)
- Falha de rede provoca nova tentativa automática (TanStack Query) e mostra a mensagem "Sem conexão"
- Em caso de `401`, o frontend renova o token sozinho. Se não conseguir, envia para o login e depois volta à tela em que o usuário estava
- **Estados vazios pensados**: diário vazio mostra "Registre sua primeira visita", em vez de uma tela em branco

### Monitoramento

**Sentry** (plano gratuito) no backend e no frontend, para detectar erros antes que os testadores reclamem.
