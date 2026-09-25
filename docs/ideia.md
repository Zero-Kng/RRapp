## As peças principais (aplicadas ao RR App)

### 1. Models (modelos)

Você descreve os dados como classes Python, e o Django cria as tabelas no banco para você.

```python
class Restaurante(models.Model):
    nome = models.CharField(max_length=200)
    cidade = models.CharField(max_length=100)

class Avaliacao(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    restaurante = models.ForeignKey(Restaurante, on_delete=models.CASCADE)
    nota = models.DecimalField(max_digits=2, decimal_places=1)  # ex: 4.5
    critica = models.TextField(blank=True)
```

Você não escreve SQL à mão. Para buscar as avaliações de um restaurante, basta:

```python
Avaliacao.objects.filter(restaurante=r)
```

### 2. Migrations (migrações)

Quando você muda um model (por exemplo, adiciona um campo "foto"), o Django gera automaticamente o script que atualiza o banco sem perder os dados.

### 3. Autenticação

Cadastro, login, logout, hash de senha e permissões já vêm prontos.

### 4. Painel Admin

É o grande trunfo para o MVP. Com poucas linhas, o Django gera uma **interface web de administração** onde você pode ver, editar e apagar restaurantes, avaliações e usuários. É a ferramenta de moderação do app, sem custo extra.

### 5. Django REST Framework (DRF)

Extensão do Django que transforma os dados em uma **API**, ou seja, em endereços que devolvem JSON:

```
GET  /api/restaurantes/?cidade=rio-de-janeiro   → lista de restaurantes
POST /api/avaliacoes/                            → cria uma avaliação
```

## Como tudo se encaixa

```
┌──────────────┐    JSON     ┌──────────────────┐        ┌────────────┐
│ React (web)  │ ◄─────────► │  Django + DRF    │ ◄────► │ PostgreSQL │
└──────────────┘             │  (API REST)      │        │  (banco)   │
┌──────────────┐    JSON     │                  │        └────────────┘
│ App mobile   │ ◄─────────► │  + Painel Admin  │ ◄────► Google Places /
│ (futuro)     │             └──────────────────┘        Foursquare
└──────────────┘
```

- O **React** cuida do que o usuário vê: telas, botões, estrelas.
- O **Django** cuida das regras, dos dados e da segurança.
- Como os dois conversam por **JSON**, o app mobile do futuro vai se conectar à mesma API, sem mudanças no backend.

## Quem usa Django

Instagram (desde o início), Pinterest, partes do Spotify, Mozilla e Disqus.

# O que é o Django

O **Django** é um **framework web escrito em Python**. Um framework é uma "estrutura pronta" que resolve problemas que todo site ou app tem, para você se concentrar no que é específico do seu projeto.

Todo app com usuários precisa de cadastro, login, senha criptografada, banco de dados, proteção contra ataques, URLs etc. Sem um framework, você escreveria tudo isso do zero. O Django já traz essas peças prontas e testadas. O lema dele é *"o framework para perfeccionistas com prazos"*.

