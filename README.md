![EcoState](frontend/public/banner.png)

EcoState é uma plataforma de simulação em tempo real onde o jogador governa um estado — terrestre, lunar ou marciano — gerenciando recursos e respondendo a crises para garantir sua sobrevivência e prosperidade. Concebido para explorar tanto a economia espacial em expansão quanto cenários de sobrevivência em condições extremas, o protótipo serve como ambiente didático e informativo sobre as interdependências entre meio ambiente, energia, economia e governança.

A simulação rastreia **12 vetores de estado** distribuídos em quatro plataformas (Terrestre, Energia, Econômica e Governança), cada um com tendência em tempo real e eventos críticos aleatórios. O jogador aloca um pool de suprimentos finito para ajustar vetores e manter o progresso do estado através de limiares crescentes — enquanto crises climáticas, epidemias ou falhas energéticas testam sua resiliência. Projetado como protótipo escalável, a arquitetura separa claramente front-end (Next.js + Three.js), back-end (FastAPI + WebSocket) e persistência (Redis), pronta para crescer tanto em profundidade de simulação quanto em tecnologias integradas.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js 15, React 19, Three.js / R3F, Tailwind CSS v4 |
| Back-end | Python 3.12, FastAPI, WebSocket (uvicorn) |
| Sessões | Redis (TTL 2h) com fallback in-memory |
| Autenticação | JWT HS256 (`python-jose`) |
| Deploy | Railway (Docker) |

---

## Arquitetura

```
Browser (usuário)
    │  HTTPS/REST  →  POST /session, POST /session/resource ...
    │  WSS         →  /ws?token=<jwt>
    ▼
Railway CDN / TLS termination
    │
    ├── Front-end  (Next.js · porta 3000)
    └── Back-end   (FastAPI · porta 8000)
                      │
                      └── Redis  (sessões · TTL 2h)
```

Todo o tráfego externo trafega sobre **TLS 1.2+** (HTTPS/WSS) — fornecido pelo Railway. A comunicação Front-end → Back-end usa JWT em cada requisição REST e na abertura do WebSocket.

---

## Rodando Localmente

### Pré-requisitos
- Node.js 22+, Python 3.12+, Redis (opcional — usa memória se ausente)

### Back-end

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Crie o arquivo de variáveis (obrigatório)
cp .env.example .env
# Edite .env e preencha JWT_SECRET com qualquer string longa

# Carregue as vars e suba o servidor
env $(cat .env | xargs) python main.py
```

### Front-end

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Acesse: `http://localhost:3000`

---

## Deploy (Railway)

1. Faça push para o GitHub
2. Crie um projeto no [railway.app](https://railway.app) a partir do repositório
3. Adicione o plugin **Redis** ao projeto
4. Configure dois serviços:

| Serviço | Root Directory | Variáveis de Ambiente |
|---|---|---|
| Back-end | `backend/` | `JWT_SECRET`, `ALLOWED_ORIGINS` |
| Front-end | `frontend/` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` |

> `REDIS_URL` é injetado automaticamente pelo plugin Redis do Railway.
> Após o front-end estar no ar, atualize `ALLOWED_ORIGINS` no back-end com a URL gerada e faça **Redeploy**.

---

---

# 🔐 Cybersecurity

---

## 1. Análise de Riscos e Ameaças

### 1.1 Identificação de Ativos

| Ativo | Descrição | Criticidade |
|---|---|---|
| **Sessões de jogo** | Estado completo da simulação (vetores, progresso, usuário) — armazenado no Redis com TTL de 2h | Alta |
| **JWT de sessão** | Token que autentica cada jogador e vincula requisições REST e WebSocket à sua sessão | Alta |
| **`JWT_SECRET`** | Chave simétrica que assina todos os tokens; se comprometida, permite forjar qualquer identidade | Crítica |
| **Canal WebSocket** | Fluxo em tempo real que entrega o estado da simulação ao browser do usuário | Média |
| **Variáveis de ambiente** | `JWT_SECRET`, `REDIS_URL`, `ALLOWED_ORIGINS` — segredos de infraestrutura | Crítica |
| **Código-fonte** | Lógica de simulação, rotas de API, regras de negócio | Média |

### 1.2 Modelo de Ameaças — Vetores de Ataque

#### Vetor 1 — Forja de Token JWT (Authentication Bypass)

**Como aconteceria:** Se o `JWT_SECRET` vazasse (ex: commitado no Git, exposto em log) ou fosse fraco demais para um ataque de força bruta offline, um atacante poderia gerar tokens JWT arbitrários com qualquer `session_id` e sequestrar sessões de outros usuários ou criar sessões ilegítimas sem passar pela API.

**Controles aplicados:**
- `JWT_SECRET` obrigatório via variável de ambiente — o servidor não sobe sem ele (`RuntimeError`)
- Nenhum valor padrão ou fallback no código
- `.env` e `.env.local` excluídos do Git via `.gitignore`
- Tokens expiram em 2 horas (`exp` no payload JWT)

#### Vetor 2 — Flooding / DoS por mensagens WebSocket

**Como aconteceria:** Um cliente malicioso (ou script automatizado) abre uma conexão WebSocket autenticada e envia milhares de mensagens por segundo — sobrecarregando o loop assíncrono do servidor, degradando a experiência de todos os outros jogadores ou provocando crash por exaustão de memória/CPU.

**Controles aplicados:**
- Rate limiting por conexão: **máximo de 20 mensagens a cada 10 segundos** (`security.py`)
- Ao exceder o limite, a mensagem é descartada com resposta `{"error": "rate_limited"}` e a conexão permanece aberta — sem possibilidade de crash por mensagem única
- Conexões inválidas são fechadas com código WebSocket adequado (4001, 4003, 4004)

#### Vetor 3 — Cross-Origin WebSocket Hijacking (CSWSH)

**Como aconteceria:** Uma página maliciosa hospedada em `https://atacante.com` tenta abrir uma conexão WebSocket para o back-end do EcoState usando o token de um usuário legítimo (obtido via XSS ou outro meio). Como WebSockets não seguem a política Same-Origin do browser automaticamente para handshake, o servidor precisaria validar a origem manualmente.

**Controles aplicados:**
- Validação do header `Origin` no handshake WebSocket contra a allowlist `ALLOWED_ORIGINS`
- CORS configurado com origens explícitas — sem wildcard `"*"` (removido durante o projeto)
- `ALLOWED_ORIGINS` configurado via variável de ambiente por ambiente (dev/produção)

#### Vetor 4 — Interceptação de Dados em Trânsito (Man-in-the-Middle)

**Como aconteceria:** Em uma rede pública (café, aeroporto), um atacante com acesso ao roteador ou usando ARP spoofing poderia capturar o tráfego HTTP não criptografado entre o browser e o servidor, obtendo o JWT do usuário e o estado completo da simulação.

**Controles aplicados:**
- Em produção, todo o tráfego é servido exclusivamente via **HTTPS e WSS** (TLS 1.2+ obrigatório pelo Railway)
- O front-end valida as variáveis `NEXT_PUBLIC_API_URL` (`https://`) e `NEXT_PUBLIC_WS_URL` (`wss://`) — sem fallback para HTTP em produção
- O HSTS é aplicado pelo CDN do Railway

#### Vetor 5 — Injeção via Input do Usuário

**Como aconteceria:** Um usuário mal-intencionado envia um payload JSON manipulado com campos extras, tipos inesperados (ex: `"amount": "'; DROP TABLE sessions; --"`), ou valores fora do intervalo esperado para tentar corromper o estado da simulação ou explorar deserialização insegura.

**Controles aplicados:**
- Todos os inputs da API são validados por **modelos Pydantic** (`models.py`) com tipagem estrita — dados inválidos retornam HTTP 422 antes de chegar à lógica de negócio
- Valores de vetores são limitados ao intervalo `[0, 100]` por `_clamp()` na engine de simulação
- `user_name` tem `max_length=32`
- No front-end, React escapa automaticamente todo conteúdo renderizado — sem uso de `dangerouslySetInnerHTML`

---

## 2. Arquitetura de Segurança

### 2.1 Controles de Acesso

**Princípio do Privilégio Mínimo:** Cada usuário recebe um JWT vinculado exclusivamente ao UUID de sua sessão. Não há conceito de "admin" ou acesso a sessões de outros usuários — cada token só autoriza operações na própria sessão.

```
POST /session           → sem autenticação (cria sessão, retorna JWT)
GET  /session           → requer JWT válido  → só lê a própria sessão
POST /session/resource  → requer JWT válido  → só modifica a própria sessão
DELETE /session         → requer JWT válido  → só deleta a própria sessão
GET  /ws?token=<jwt>    → requer JWT válido  → stream da própria sessão
```

**Fluxo de autenticação:**
1. Front-end envia `POST /session` com nome/região/estação
2. Back-end cria sessão com UUID aleatório, assina JWT com `JWT_SECRET`
3. JWT é retornado ao front-end e armazenado em memória (Zustand) — **não em localStorage ou cookie**
4. Toda requisição subsequente inclui `Authorization: Bearer <token>`
5. Token expira em 2 horas; sessão no Redis expira no mesmo período

**Isolamento de sessões:** Chaves Redis no formato `ecostate:session:<uuid>` — impossível adivinhar ou enumerar sessões de outros usuários sem o JWT correspondente.

### 2.2 Proteção de Dados

| Dado | Em Trânsito | Em Repouso |
|---|---|---|
| Estado da simulação | TLS 1.2+ (HTTPS/WSS) | Redis serializado JSON + TTL 2h (auto-expira) |
| JWT | TLS 1.2+ | Memória do browser (Zustand) — nunca em disco |
| `JWT_SECRET` | Nunca trafega | Variável de ambiente do servidor — nunca no código |
| Dados pessoais | TLS 1.2+ | Apenas `user_name` (até 32 chars) — sem e-mail, CPF, senha |

**Minimização de dados (Privacy by Design):** O EcoState coleta exclusivamente o nome do operador (campo livre, sem verificação de identidade real), região e estação do ano escolhidos. Nenhum dado de localização real, comportamental, ou identificador pessoal é coletado ou armazenado.

**Expiração automática:** Sessões expiram automaticamente após 2 horas no Redis — não há dados persistentes além da janela de jogo ativa.

### 2.3 Segurança da Infraestrutura

**Containers não-root:** Ambos os Dockerfiles (front-end e back-end) criam um usuário de sistema dedicado (`appuser`) e rodam o processo principal sem privilégios root — limitando o impacto de uma eventual exploração de vulnerabilidade na aplicação.

**Isolamento de build:** O `.dockerignore` do back-end exclui `venv/`, `__pycache__/` e `.env*` da imagem final — reduzindo a superfície de ataque e o tamanho do artefato.

**Segredos por variável de ambiente:** Nenhum segredo (`JWT_SECRET`, `REDIS_URL`, `ALLOWED_ORIGINS`) está presente no código-fonte ou na imagem Docker. Todos são injetados pelo Railway em tempo de execução.

**CORS restritivo:** O middleware CORS do FastAPI aceita requisições apenas da origem configurada em `ALLOWED_ORIGINS`. Em produção, isso é a URL exata do front-end no Railway — qualquer outra origem recebe HTTP 403.

**Rate limiting WebSocket:** Sliding window de 10 segundos com limite de 20 mensagens por conexão — protege contra flooding sem bloquear uso legítimo.

**Shutdown gracioso:** O lifespan do FastAPI cancela todas as tasks de simulação ativas ao desligar o servidor — evitando corrupção de estado no Redis durante deploys.

---

## 3. Governança e Compliance

### 3.1 Alinhamento ISO 27001

A ISO 27001 estrutura a gestão de segurança da informação em torno de um ciclo de melhoria contínua (PDCA). O EcoState implementa os seguintes controles do Anexo A relevantes ao seu escopo:

| Controle ISO 27001 | Implementação no EcoState |
|---|---|
| **A.9 — Controle de Acesso** | JWT por sessão, privilégio mínimo, expiração de token e sessão |
| **A.10 — Criptografia** | JWT assinado com HS256; TLS em trânsito (Railway); `JWT_SECRET` obrigatório por env var |
| **A.12 — Segurança Operacional** | Containers não-root; `.dockerignore`; segredos fora do código; Redis com TTL |
| **A.13 — Segurança de Comunicações** | CORS restritivo; validação de Origin no WebSocket; HTTPS/WSS obrigatório |
| **A.14 — Aquisição e Desenvolvimento** | Validação de input com Pydantic; revisão de segurança documentada; `.gitignore` cobrindo segredos |
| **A.16 — Gestão de Incidentes** | Plano de resposta documentado (seção 4 deste documento) |
| **A.18 — Conformidade** | Minimização de dados em conformidade com LGPD; sem coleta de PII |

**Gestão de Riscos (cláusula 6.1):** Os riscos foram identificados, avaliados por probabilidade e impacto, e controles foram priorizados conforme a criticidade dos ativos. Os riscos residuais (ex: token JWT em query string do WebSocket) são documentados e aceitos no contexto acadêmico do projeto, com plano de mitigação definido para versão futura.

### 3.2 Privacidade — LGPD / Privacy by Design

O EcoState aplica os seguintes princípios alinhados à **Lei Geral de Proteção de Dados (Lei nº 13.709/2018)**:

**Finalidade e Necessidade:** O único dado de identificação coletado é o `user_name` — um apelido livre escolhido pelo próprio usuário, sem relação com identidade real. Não há cadastro, e-mail, senha, CPF, ou qualquer outro dado pessoal.

**Não-permanência:** Sessões expiram automaticamente em 2 horas (Redis TTL). Não existe banco de dados permanente — ao encerrar a sessão, os dados são deletados explicitamente via `DELETE /session` ou expiram automaticamente.

**Transparência:** O usuário é informado na tela inicial sobre o que está configurando (nome, região, estação) antes de iniciar.

**Sem compartilhamento:** Nenhum dado é enviado a terceiros, analíticos, ou serviços de rastreamento. O front-end não inclui scripts de terceiros (Google Analytics, Meta Pixel, etc.).

**Sem dados comportamentais:** As ações do usuário dentro da simulação (ajustes de vetores) são processadas em tempo real e não são armazenadas como histórico ou perfil comportamental.

---

## 4. Plano de Resiliência e Continuidade

### 4.1 Plano de Resposta a Incidentes

O plano segue as fases **Contenção → Erradicação → Recuperação → Lições Aprendidas**, baseadas no framework NIST SP 800-61.

---

#### Fase 1 — Detecção e Contenção (0–30 minutos)

**Cenário: Comprometimento do `JWT_SECRET` ou tokens forjados detectados**

| Ação | Responsável | Tempo |
|---|---|---|
| Identificar o incidente via logs anômalos (requisições com tokens inválidos repetidos, sessões criadas em volume anormal) | Equipe técnica | 0–10 min |
| **Rotacionar imediatamente o `JWT_SECRET`** no Railway (Settings → Variables → novo valor gerado com `openssl rand -hex 32`) | Dev / Ops | 5 min |
| O Railway faz redeploy automático ao salvar a variável — todos os JWTs emitidos com o secret antigo tornam-se **imediatamente inválidos** | Automático | 5–10 min |
| Flush do Redis: `FLUSHDB` via Railway Redis console — destrói todas as sessões ativas (incluindo as comprometidas) | Dev | 5 min |

**Cenário: Flooding / DoS detectado**

| Ação | Responsável | Tempo |
|---|---|---|
| Identificar IP de origem nos logs do Railway | Dev | 5 min |
| Bloquear IP via regras de firewall do Railway ou Cloudflare (se configurado) | Ops | 10 min |
| O rate limiter embutido (20 msgs/10s) já descarta automaticamente mensagens excedentes sem derrubar o serviço | Automático | Imediato |

---

#### Fase 2 — Erradicação (30 min–2 horas)

| Ação | Detalhes |
|---|---|
| Auditoria do código-fonte | Verificar se o secret foi commitado acidentalmente no Git; usar `git log -S "JWT_SECRET"` para busca no histórico |
| Remoção do histórico (se necessário) | `git filter-branch` ou `BFG Repo Cleaner` para apagar o segredo do histórico Git; notificar GitHub para invalidar cache |
| Revisão das variáveis de ambiente | Confirmar que nenhum outro segredo está exposto (REDIS_URL, etc.) |
| Atualizar dependências vulneráveis | `pip audit` no back-end, `npm audit` no front-end — aplicar patches |

---

#### Fase 3 — Recuperação (2–4 horas)

| Ação | Detalhes |
|---|---|
| Redeploy limpo | Novo build a partir de imagem base atualizada, com novo `JWT_SECRET` |
| Verificação funcional | Testar fluxo completo: criação de sessão → WebSocket → ajuste de recurso → fim de jogo |
| Monitoramento reforçado | Acompanhar logs do Railway por 24h após o incidente para detectar reincidência |
| Comunicação | Notificar usuários afetados (no contexto de produção real) sobre a necessidade de iniciar nova sessão |

---

#### Fase 4 — Lições Aprendidas (pós-incidente)

- Documentar a linha do tempo e causa raiz no README ou wiki do projeto
- Avaliar implementação de `jti` no JWT + blocklist Redis para invalidação granular de tokens
- Avaliar migração do token WebSocket de query string para header de handshake
- Implementar alertas automáticos (ex: Railway + Slack webhook para erros 4xx/5xx em volume acima do normal)

---

### 4.2 Disponibilidade e Continuidade

| Mecanismo | Descrição |
|---|---|
| **Restart automático** | `railway.toml`: `restartPolicyType = "ON_FAILURE"` — containers reiniciam automaticamente após falha |
| **Fallback de sessões** | Se o Redis ficar indisponível, o back-end cai para armazenamento em memória sem interromper o serviço |
| **Shutdown gracioso** | Tasks de simulação são canceladas limpiamente ao desligar — sem corrupção de estado |
| **TTL de sessão** | Sessões orphaned (sem WebSocket conectado) expiram automaticamente em 2h, liberando memória |
| **Imagens Docker imutáveis** | Cada deploy gera uma nova imagem; rollback é possível via Railway com um clique |

---

## Resumo das Vulnerabilidades e Controles

| # | Vulnerabilidade | Vetor de Ataque | Controle Implementado |
|---|---|---|---|
| 1 | JWT Secret fraco/exposto | Brute force offline, vazamento em Git | `JWT_SECRET` obrigatório por env var; sem fallback no código; excluído do Git |
| 2 | Flooding WebSocket | Script automatizado enviando mensagens em loop | Rate limiter: 20 msgs/10s por conexão (`security.py`) |
| 3 | Cross-Origin WebSocket Hijacking | Página maliciosa abrindo WS com token roubado | Validação do header `Origin` contra `ALLOWED_ORIGINS` |
| 4 | Man-in-the-Middle | Captura de tráfego em rede pública | TLS obrigatório em produção (HTTPS/WSS via Railway) |
| 5 | Injeção via input | Payload JSON malformado / valores fora do intervalo | Validação Pydantic em todos os endpoints; `_clamp(0, 100)` na engine |
| 6 | CORS aberto | Requisições de origens não autorizadas | `allow_origins=list(ALLOWED_ORIGINS)` — sem wildcard |
| 7 | Container root | Escalação de privilégios pós-exploração | Usuário `appuser` não-root em ambos os Dockerfiles |
| 8 | Segredos no Git | Exposição do repositório público | `.gitignore` cobre `.env`, `.env.local`, `venv/`, `.next/` |
| 9 | Session hijacking WS | Conexão duplicada com mesmo token | Segunda conexão sobrescreve a primeira (mitigação parcial) |
| 10 | Dados pessoais persistentes | Perfil de usuário armazenado indefinidamente | TTL de 2h no Redis; `DELETE /session` no encerramento; zero PII coletado |

---

## Tecnologias

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=flat-square&logo=socket.io&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)
