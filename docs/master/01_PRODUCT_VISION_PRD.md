# AISTUDYTEC — Product Vision e PRD

Versão 1.0 — 21 de julho de 2026  
Status: baseline para refinamento e execução incremental

## 1. Sumário executivo

O AISTUDYTEC é uma plataforma de estudo complementar para estudantes brasileiros do Ensino Médio. Seu diferencial não é “usar IA”, mas organizar um ciclo pedagógico supervisionado: professor define o tema; IA propõe explicações e questões; vídeos reais são recuperados; professor revisa e publica; aluno estuda, recebe feedback e revisa habilidades frágeis.

Este PRD transforma o protótipo em plano de produto mensurável. Não presume eficácia, retenção, satisfação ou desempenho ainda não medidos. Metas só se tornam compromissos depois de baseline instrumentada.

## 2. Visão do produto

### 2.1 Visão

Ser a experiência de estudo complementar mais clara, confiável e motivadora para adolescentes do Ensino Médio brasileiro, mantendo o professor como autoridade pedagógica e usando IA como infraestrutura assistiva.

### 2.2 Princípios

1. Aprendizagem antes de engajamento vazio.
2. Professor antes da automação.
3. Progresso compreensível antes de pontuação abstrata.
4. Segurança e privacidade por padrão.
5. Inclusão em redes e aparelhos modestos.
6. Evidência antes de promessa.
7. Evolução incremental antes de reescrita total.

### 2.3 Não objetivos imediatos

- Substituir professor, aula ou material curricular.
- Publicar automaticamente conteúdo oficial gerado por IA.
- Criar ranking público de estudantes.
- Otimizar tempo de tela ou notificações compulsivas.
- Declarar alinhamento oficial à BNCC sem validação humana.
- Migrar toda a stack em uma única entrega.

## 3. Personas e necessidades

### Estudante

Faixa-alvo: 14–18 anos. Precisa entender o próximo passo, escolher profundidade, errar com segurança, acompanhar habilidades e retomar estudo sem fricção. Variações de conectividade, dispositivo, letramento digital e necessidades de acessibilidade devem ser consideradas.

### Professor

Precisa transformar necessidades observadas em conteúdo revisável, identificar pendências do gate, editar sem medo de perder alterações e acompanhar turma por habilidade sem leitura de tabelas extensas.

### Administrador

Precisa controlar acesso, integridade e operação. O papel atual é funcionalmente mínimo e requer redefinição antes do piloto.

### Responsável e gestão escolar

Stakeholders futuros. Precisam de transparência sobre dados, finalidade, consentimento quando aplicável, segurança e limites da IA. Não terão dashboard até requisitos legais e pedagógicos serem definidos.

## 4. Jornadas principais

### 4.1 Professor: tópico oficial

Criar turma → cadastrar tópico → gerar conteúdo → revisar três níveis → revisar questões/habilidades → aprovar vídeo por nível → resolver pendências → publicar → acompanhar habilidades.

Critério de sucesso: professor conclui a publicação sem dúvida sobre salvamento, pendências ou alcance da ação.

### 4.2 Aluno: sessão de estudo

Entrar → ver recomendação e revisões vencidas → escolher tópico → selecionar nível → estudar explicação e vídeo → iniciar quiz → receber feedback por item → concluir → entender próximo passo.

Critério de sucesso: aluno consegue explicar o que avançou e o que precisa revisar sem depender de uma nota isolada.

### 4.3 Aluno: tema livre

Pesquisar tema → receber aviso de conteúdo não revisado → gerar → estudar → responder → manter conteúdo separado do catálogo oficial.

Critério de sucesso: distinção entre conteúdo oficial e não revisado é inequívoca.

## 5. Regras de negócio protegidas

- Domínio: ≥70% por habilidade.
- Revisão: três dias após desempenho abaixo do limiar.
- Geração: 8–10 questões; implementação atual solicita nove.
- Gate: três explicações, ≥5 questões válidas e ≥1 vídeo aprovado por nível.
- Tema livre: não revisado, individual e nunca oficial.

Mudanças exigem decisão de produto e, quando afetarem aprendizagem, hipótese e protocolo de avaliação.

## 6. Auditoria do estado atual

Escalas: impacto (alto/médio/baixo); complexidade (P/M/G); estimativas são faixas de engenharia, não compromissos.

| ID | Achado observado | Impacto | Complexidade | Prioridade | Estimativa |
|---|---|---:|---:|---:|---:|
| A01 | Sessão e matriz de autorização por usuário, turma e tópico entregues; E2E autenticado permanece pendente | Alto | G | Em validação | 22 jul. 2026 |
| A02 | Credencial master padrão era criada no código — resolvido na Sprint 1; provisionamento agora usa ambiente e desabilita legado | Alto | M | Concluído | 21 jul. 2026 |
| A03 | URL da API era editável na interface — resolvido na Sprint 1 com configuração de ambiente | Alto | P | Concluído | 21 jul. 2026 |
| A04 | Chaves de API seguem em query string das chamadas externas | Alto | M | P0 | 1–2 dias |
| A05 | CORS por allowlist, headers e rate limit entregues na Sprint 1; autenticação/CSRF seguem dependentes da estratégia de sessão | Alto | M | Em validação | 22 jul. 2026 |
| A06 | Primeira camada de validação entregue para tópicos, conteúdo, quiz e progresso; schema centralizado permanece pendente | Alto | G | Em validação | 22 jul. 2026 |
| A07 | Mojibake pt-BR corrigido e bloqueado pela verificação UTF-8 automatizada | Alto | M | Concluído | 22 jul. 2026 |
| A08 | Tailwind por CDN removido e substituído por compilação local | Médio | M | Concluído | 22 jul. 2026 |
| A09 | Estados carregando/vazio/erro padronizados nas jornadas docentes prioritárias | Alto | M | Concluído | 22 jul. 2026 |
| A10 | Edição onBlur não confirmava salvamento — primeira correção entregue com estados salvando/salvo/erro | Alto | M | Em validação | 21 jul. 2026 |
| A11 | Publicação e exclusão de questão possuem confirmação acessível | Alto | P | Concluído | 22 jul. 2026 |
| A12 | Baseline inicial de viewport, nomes acessíveis e foco criado; auditoria WCAG completa permanece pendente | Alto | G | Em validação | 22 jul. 2026 |
| A13 | Sidebar convertida em drawer móvel e layout validado em 320 px sem overflow | Alto | G | Concluído | 22 jul. 2026 |
| A14 | App usa navegação por estado sem URL compartilhável | Médio | G | P2 | 4–7 dias |
| A15 | Dados remotos são geridos manualmente, sem cache/retry | Médio | G | P2 | 4–7 dias |
| A16 | Não há instrumentação de produto ou performance | Alto | M | P1 | 3–5 dias |
| A17 | Não há testes frontend/E2E | Alto | G | P1 | 5–10 dias |
| A18 | SQLite e app.py concentram responsabilidades | Médio | G | P2 | 8–15 dias |
| A19 | Tags livres de habilidade fragmentam agregações | Alto | G | P1 | 5–10 dias |
| A20 | Sem modo offline e estratégia para rede instável | Médio | G | P2 | 8–15 dias |
| A21 | Dashboard docente convertido em fila de intervenções com origem e ação possível | Médio | M | Concluído | 22 jul. 2026 |
| A22 | Plano diário, mapa de habilidades e linha do tempo entregues com dados persistidos | Alto | M | Concluído | 22 jul. 2026 |
| A23 | Não há dark mode; prioridade depende de pesquisa | Baixo | M | P3 | 2–4 dias |
| A24 | Build CRA está envelhecido e concentra 28 alertas transitivos do npm audit; migração exige estratégia e regressão | Alto | G | P1 | 5–10 dias |

## 7. Hipóteses de produto

| Hipótese | Mudança | Indicador | Proteção |
|---|---|---|---|
| Clareza aumenta conclusão | “Próximo passo” na home | conclusão de sessão | não aumentar notificações |
| Feedback de salvamento aumenta confiança docente | estados salvando/salvo/erro | erros e abandono na revisão | retry idempotente |
| Revisões visíveis aumentam retorno útil | plano diário | revisões concluídas no prazo | sem punição por sequência perdida |
| Progresso por competência melhora compreensão | mapa de habilidades | compreensão autorrelatada | não ocultar evidência |
| Missões voluntárias ajudam hábito | metas escolhidas | sessões úteis/semana | opt-out e sem ranking público |

## 8. Métricas

### North Star proposta

Sessões de estudo concluídas com evidência de aprendizagem: sessão que contém estudo, ao menos uma resposta válida e próximo passo registrado. A métrica deve ser validada para não premiar repetição superficial.

### Funil

- Ativação: cadastro → primeira sessão concluída.
- Valor docente: tópico criado → tópico publicado.
- Aprendizagem: tentativa → habilidade atualizada → revisão concluída.
- Retenção: retorno útil em 7/28 dias, sem usar streak como único sinal.
- Qualidade: conteúdo rejeitado/editado pelo professor, erros por provedor, abandono por etapa.
- Segurança: acessos negados, incidentes, exposição de segredos, exclusão de dados.

Não existem baselines reais no projeto. Metas numéricas serão definidas após instrumentação e piloto.

## 9. Progressão e gamificação responsável

### Permitido

- XP como representação secundária de esforço verificável.
- Níveis pessoais sem comparação pública.
- Missões escolhidas pelo aluno.
- Conquistas por comportamentos de aprendizagem, não tempo de tela.
- Mapa de habilidades e linha do tempo.
- Sequência com recuperação gentil, sem perda punitiva.
- Colecionáveis cosméticos sem compra ou aleatoriedade monetizada.

### Não permitido

- Ranking público por nota.
- Recompensa variável opaca.
- Notificações de culpa ou medo de perda.
- Dopamine loop como objetivo.
- Bloqueio de conteúdo essencial por XP.
- Uso de dado acadêmico para pressão social.

### Modelo inicial

“Progresso” é a camada principal. XP, missões e conquistas são opcionais e desligáveis. A árvore de habilidades mostra evidências, data da última prática e recomendação. Temporadas só serão consideradas após pesquisa com alunos e professores.

## 10. Requisitos funcionais

### RF-01 Identidade e autorização

Sessão segura, papéis explícitos, encerramento, recuperação e escopo por turma. Professor só opera suas turmas; aluno só acessa seus dados e conteúdo autorizado.

### RF-02 Home do aluno

Apresentar “continuar estudando”, revisões vencidas, missão escolhida, mapa resumido e catálogo. Não exibir dashboard denso como primeira experiência.

### RF-03 Estudo

Permitir nível, vídeo aprovado, texto legível, marcação de progresso, navegação por teclado e retomada.

### RF-04 Quiz

Uma questão por vez, progresso, resposta acessível, feedback imediato, explicação, avanço manual, retomada após falha e resumo final orientado a habilidades.

### RF-05 Revisão docente

Autosave explícito, histórico local de estado, indicadores por seção, gate visível, confirmação de ações destrutivas e preview do aluno.

### RF-06 Dashboard docente

Começar por perguntas: quem precisa de apoio, em qual habilidade, desde quando e qual ação é possível. Gráficos devem possuir alternativa textual/tabela acessível.

### RF-07 Mentor de IA

O mentor explica, pergunta, sugere revisão e reconhece esforço. Não diagnostica saúde, não substitui professor, não inventa certeza e não publica conteúdo oficial.

### RF-08 Preferências

Tema, movimento reduzido, tamanho de texto, notificações e camada de progressão. Preferências acessíveis sem esconder configurações críticas.

## 11. Requisitos não funcionais

- WCAG 2.2 AA como critério verificável.
- Orçamento inicial: JS comprimido, imagens, chamadas e Core Web Vitals medidos em aparelho/rede definidos.
- Lighthouse ≥95 é objetivo condicionado ao perfil de teste documentado, não resultado atual.
- Primeiro conteúdo útil <2 s é objetivo condicionado a baseline, cache e rede de referência.
- API versionada, validação de entrada, idempotência em mutações críticas e erros estruturados.
- Logs sem dados pessoais desnecessários e sem chaves.
- Backup, migração e recuperação testados antes do piloto.

## 12. Roadmap de cinco sprints

### Sprint 1 — Fundação confiável

Objetivo: remover riscos que impedem testes reais.

- Corrigir encoding pt-BR.
- Remover URL da API da UI e usar configuração de ambiente.
- Adicionar validação de payloads e erros consistentes.
- Remover credencial master fixa.
- Implementar confirmação visual de salvamento.
- Criar baseline de acessibilidade e performance.

Aceite: testes existentes passam; build passa; nenhum segredo no cliente; fluxos críticos legíveis em pt-BR; salvamento possui estados.

### Sprint 2 — Mobile-first e design system mínimo

Objetivo: tornar as jornadas principais usáveis em celular.

- Tokens e primitives: Button, Input, Card, Badge, Progress, Dialog, Toast, Skeleton.
- Navegação inferior no aluno e drawer no professor.
- Estados vazio/erro/loading padronizados.
- Quiz mobile-first e foco acessível.
- Testes de componentes críticos.

Aceite: 320 px sem scroll horizontal; teclado completo; contraste AA; regressão visual documentada.

### Sprint 3 — Progresso que orienta

Objetivo: transformar dados existentes em próximo passo.

- Home do aluno, plano diário, mapa de habilidades e linha do tempo.
- Resumo final do quiz por habilidade.
- Dashboard docente acionável.
- Instrumentação com taxonomia e consentimento.

Aceite: eventos validados; nenhum ranking público; toda recomendação explica sua origem.

### Sprint 4 — Arquitetura e segurança para piloto

Objetivo: permitir piloto controlado.

- Autenticação e autorização.
- Migrações versionadas, serviços e repositórios.
- Rate limit, CORS restrito, CSRF conforme estratégia.
- Testes E2E e backup/restauração.
- Migração frontend incremental para TypeScript strict e TanStack Query.

Aceite: matriz de autorização automatizada; threat model atualizado; zero segredo em logs; rollback testado.

### Sprint 5 — Engajamento responsável e pesquisa

Objetivo: testar progressão sem comprometer autonomia.

- Missões voluntárias, XP secundário e conquistas pedagógicas.
- Preferência para reduzir/desligar progressão.
- Mentor contextual com guardrails.
- Piloto aprovado eticamente e dashboards de experimento.

Aceite: protocolo aprovado; métricas de aprendizagem separadas de engajamento; análise de grupos; mecanismo de interrupção.

## 13. Critério de aceite global

Cada incremento deve incluir história, critérios observáveis, instrumentação quando aplicável, testes, acessibilidade, documentação, risco e rollback. Commit lógico é prática de engenharia, mas só será realizado quando o repositório Git estiver operacional e houver autorização.

## 14. Decisões pendentes

1. `grade_year`: perfil, turma ou tópico como fonte principal.
2. Estratégia de identidade e consentimento para menores.
3. Uso de TypeScript: migração progressiva ou nova shell.
4. Router e deep links.
5. Hospedagem, domínio e ambiente de piloto.
6. Escopo de gamificação aprovado por alunos e professores.
7. Critérios oficiais para vocabulário de habilidades.

## 15. Baseline funcional consolidada — 22 de julho de 2026

O produto passou a operacionalizar autoaprendizagem orientada em três etapas: Descobrir, Aprofundar e Conectar. Cada novo tema contém pergunta mobilizadora, objetivos, leitura guiada, ideias essenciais, conexão concreta, investigação que exige comparação de fontes, missão de vídeo, desafio com evidência, reflexão, discussão, diário local e checklist de autonomia.

Gemini e YouTube foram validados com credenciais reais protegidas. A geração usa `gemini-2.5-flash`; o contrato exige três trilhas completas e nove questões. A recuperação de vídeo exige correspondência temática no título, aceita 3–20 minutos e prefere ausência a recomendação fora do assunto. A geração síncrona informa espera e dispõe de 180 s no cliente.

Evidência acumulada: 40 testes backend, 15 testes frontend e build de produção aprovado. Não houve avaliação com participantes; portanto, não se declara eficácia, engajamento, aprendizagem ou usabilidade.

### Sprint 5 — Imersão e provedores reais

Objetivo: elevar a experiência de conteúdo ao padrão de aprendizagem ativa e remover incerteza sobre integrações reais. Resultado: incremento concluído tecnicamente; job assíncrono, idempotência e validação docente sistemática seguem no backlog.
