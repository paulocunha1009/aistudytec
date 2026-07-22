# AISTUDYTEC — UX Bible e Design System

Versão 1.1 — 22 de julho de 2026

## 1. Direção de experiência

O produto deve parecer contemporâneo, confiável e adolescente sem infantilização. A referência não é copiar Duolingo, Spotify ou Discord, mas aprender com clareza de próximo passo, feedback instantâneo, identidade e continuidade.

### Assinatura visual: laboratório de aprendizagem

O shell utiliza azul-noite, ciano elétrico, azul intenso e lima como sinal de descoberta. A home combina malha técnica discreta, órbitas de conhecimento e um command center de busca. Essa linguagem representa o ciclo entender → praticar → dominar e diferencia o produto de dashboards educacionais brancos e genéricos.

A expressividade concentra-se no hero, navegação e transições de contexto. Textos longos, formulários densos e revisão docente mantêm superfícies sólidas e baixa carga visual. Órbitas e brilhos são decorativos, ficam fora da árvore acessível e respeitam movimento reduzido.

## 2. Princípios UX

1. Uma ação principal por contexto.
2. Progresso explicado por habilidade.
3. Erro como informação, nunca punição.
4. IA identificada e limitada.
5. Controle do aluno sobre metas e estímulos.
6. Professor vê ação, não apenas gráfico.
7. Mobile-first e teclado/screen reader desde o componente.
8. Movimento comunica mudança; não decora.

## 3. Arquitetura de informação

### Aluno

Hoje → Explorar → Progresso → Perfil.

“Hoje” reúne continuar, revisões e missão. “Explorar” separa conteúdo da turma de tema livre. “Progresso” contém mapa, habilidades e histórico. “Perfil” contém preferências, privacidade e acessibilidade.

### Professor

Visão geral → Turmas → Conteúdos → Alunos → Configurações.

Em celular, navegação prioritária + menu; em desktop, sidebar recolhível.

## 4. Design tokens

### Cores semânticas

```css
--color-brand-50: #eaf3ff;
--color-brand-500: #0b6bff;
--color-brand-700: #0648b8;
--color-accent-cyan: #22d3ee;
--color-signal-lime: #bef264;
--color-night: #07111f;
--color-ink: #0b1728;
--color-muted: #64748b;
--color-surface: #ffffff;
--color-canvas: #eef3f8;
--color-success: #16835b;
--color-warning: #a86800;
--color-danger: #c33a45;
--color-focus: #7c3aed;
```

Cor nunca é o único sinal. Contraste deve ser medido em todos os pares.

### Tipografia

- Família: Inter ou fonte de sistema; decisão final depende de performance e licença.
- Display: 32/40, peso 700.
- H1: 28/36, 700.
- H2: 22/30, 700.
- H3: 18/26, 650.
- Body: 16/24, 400.
- Small: 14/20, 400.
- Minimum interactive: 14 px; conteúdo não deve depender de 12 px.

### Espaçamento

Escala 4, 8, 12, 16, 24, 32, 48, 64. Touch target mínimo 44×44 px. Conteúdo mobile com 16 px laterais; tablet 24; desktop 32.

### Forma e elevação

- Radius: 8 para controles, 12 para cards, 16 para destaque.
- Sombras discretas; borda é padrão.
- Nenhum glassmorphism em conteúdo denso.

### Movimento

- 120 ms feedback imediato.
- 180–240 ms transições comuns.
- 300 ms mudanças de contexto.
- Respeitar `prefers-reduced-motion`.
- Sem confete automático; celebração opcional e curta.

## 5. Componentes

Cada componente possui default, hover, focus-visible, pressed, disabled, loading, success e error quando aplicável.

### Button

Variantes primary, secondary, ghost e danger. Loading preserva largura. Danger exige confirmação quando irreversível.

### Input, Select e Textarea

Label persistente, ajuda, erro ligado por `aria-describedby`, foco forte, contador quando houver limite. Placeholder não substitui label.

### Card

Usar para unidade acionável, não como caixa decorativa. Card clicável tem elemento interativo único e foco visível.

### Badge

Estado curto: rascunho, revisão, publicado, não revisado. Texto acompanha cor.

### Progress

Exibe valor, denominador ou descrição. Nunca depender somente de barra. Progresso de quiz não revela acerto antes da resposta.

### Dialog e Bottom Sheet

Dialog desktop, bottom sheet mobile para decisões simples. Trap de foco, Escape, retorno de foco e título acessível.

### Toast

Complementar, não único registro de erro. `aria-live`; sucesso curto; erro persiste quando exige ação.

### Skeleton

Replica geometria, evita CLS e não simula conteúdo indefinidamente. Após timeout, vira estado de erro.

### Empty State

Explica por que está vazio e oferece próxima ação. Sem ilustração que infantilize.

### Chart

Título, legenda, unidade, descrição e tabela alternativa. Paleta segura para daltonismo.

### Tooltip

Somente informação suplementar; acionável por hover e foco. Nunca esconder ação essencial.

## 6. Padrões de progressão

### XP

Secundário, baseado em atividades concluídas com integridade. Sem multiplicadores aleatórios ou compra.

### Missão

Meta escolhida: “revisar duas habilidades” ou “concluir um tópico”. Pode ser adiada sem punição.

### Sequência

Mostra consistência, oferece dia de recuperação e nunca usa linguagem de perda. Preferência permite ocultar.

### Conquista

Reconhece comportamentos: revisar erro, concluir primeira revisão, estudar diferentes níveis. Não recompensa apenas volume.

### Ranking

Não implementar na baseline. Se pesquisado, usar grupos privados, opt-in e métricas não acadêmicas. Aprovação ética obrigatória.

## 7. Telas do aluno

### 7.1 Hoje

Objetivo: responder “o que vale fazer agora?”.

Wireframe:

```text
[Olá, Ana]                 [avatar]
[Continuar: Função afim — 8 min]
[2 revisões para hoje] [Revisar]
[Missão escolhida: 1/3]
[Mapa resumido de habilidades]
[Conteúdos recentes]
[Hoje] [Explorar] [Progresso] [Perfil]
```

Estados: novo usuário, com revisão, sem revisão, offline, erro parcial, loading.  
Microinteração: progresso atualiza com transição curta e anúncio acessível.  
Tempo esperado: identificar próxima ação em até poucos segundos; medir em teste, não presumir.

### 7.2 Explorar

Conteúdos da turma primeiro; busca e filtros; tema livre visualmente separado com aviso antes de gerar. Cards mostram disciplina, ano, duração estimada e status docente.

### 7.3 Estudo

Seletor simples/técnico/avançado, texto com largura de leitura, vídeo aprovado, transcrição/link quando disponível, marcar seção e iniciar quiz. Nível não é rótulo de inteligência.

### 7.4 Quiz

Uma pergunta, alternativas grandes, teclado numérico/letras, feedback imediato, explicação, “entendi” e “ver de outro jeito”. Próxima ação manual. Erro de envio preserva respostas.

### 7.5 Resultado

Evitar tela centrada em nota. Mostrar habilidades praticadas, evidência, revisões agendadas e próxima ação. Nota permanece acessível quando necessária ao contexto.

### 7.6 Progresso

Mapa de habilidades com estados “começando”, “em prática”, “consistente” e “revisar”. Os estados precisam mapear para dados transparentes; manter limiar de 70% enquanto regra vigente.

## 8. Telas do professor

### 8.1 Visão geral

Perguntas acionáveis: tópicos aguardando revisão, habilidades frágeis, alunos sem atividade recente e falhas de geração.

### 8.2 Turma

Resumo, código com controles de compartilhamento, alunos, conteúdos e habilidades. Dados pessoais mínimos.

### 8.3 Conteúdo

Kanban simples: rascunho, gerado, pronto, publicado. Filtros, busca e ação de criar.

### 8.4 Revisão

Stepper: explicações → questões → vídeos → preview → publicar. Cada etapa mostra completude, salvando/salvo/erro e alterações não sincronizadas. Regenerar explica o que será substituído.

### 8.5 Dashboard

Começar por lista de intervenções. Heatmap é secundário e acessível. Cada indicador liga a estudantes/habilidades e sugere ação docente, sem recomendação automática opaca.

## 9. Mentor de IA

### Personalidade

Calmo, direto, respeitoso, não infantilizado. Reconhece esforço específico, não elogia genericamente. Faz uma pergunta por vez.

### Capacidades permitidas

- Reformular explicação.
- Criar exemplo adicional.
- Fazer pergunta socrática.
- Recomendar revisão baseada em dados existentes.
- Explicar por que uma resposta está errada.
- Sugerir procurar o professor quando necessário.

### Limites

- Não afirmar certeza quando não há fonte.
- Não diagnosticar transtorno ou capacidade.
- Não manipular emoção.
- Não substituir decisão do professor.
- Não ocultar que é IA.
- Não acessar dados além do necessário.

## 10. Responsividade

- 320–479: uma coluna, bottom nav, sheets, controles 44 px.
- 480–767: uma coluna ampla e grids seletivos.
- 768–1023: duas colunas, navegação adaptativa.
- ≥1024: sidebar, conteúdo com largura máxima e painéis auxiliares.

Nunca reduzir fonte para encaixar. Tabelas viram cards ou scroll com rótulos; gráficos simplificam sem remover alternativa textual.

## 11. Dark mode

Não é requisito da Sprint 1. Quando implementado, usar tokens semânticos, contraste medido, imagens e gráficos adaptados e preferência do sistema. Não inverter cores mecanicamente.

## 12. Acessibilidade WCAG 2.2 AA

- Landmarks, heading order e skip link.
- Nome acessível em todo controle.
- Fluxo completo por teclado.
- Foco visível e restaurado em dialogs.
- Contraste e informação não dependente de cor.
- Zoom 200% e reflow 320 CSS px.
- Mensagens por `aria-live` sem excesso.
- Redução de movimento.
- Alternativas para gráficos, vídeo e imagem.
- Testes automáticos + navegação manual com leitor de tela.

## 13. Conteúdo e voz

- “Vamos revisar” em vez de “Você falhou”.
- “Conteúdo gerado por IA, ainda não revisado” em vez de aviso vago.
- “Salvo” / “Não foi possível salvar. Tentar novamente.”
- Verbos claros em botões; evitar “OK”.
- Frases curtas, termos escolares brasileiros e exemplos sem estereótipos.

## 14. Instrumentação UX

Eventos mínimos: home_viewed, recommendation_opened, study_started, level_changed, quiz_started, answer_submitted, feedback_viewed, quiz_completed, review_completed, topic_edit_saved, publish_blocked, topic_published.

Cada evento tem finalidade, campos permitidos, retenção e dono. Não capturar texto livre, resposta bruta ou dado pessoal sem necessidade.

## 15. Critérios de usabilidade

- Aluno encontra próxima atividade sem instrução do moderador.
- Professor reconhece pendências antes de publicar.
- Usuário identifica conteúdo não revisado.
- Erro de rede não perde respostas ou edição silenciosamente.
- Fluxos críticos funcionam por teclado e leitor de tela.
- Interface é compreensível em 320 px e zoom 200%.

Os critérios serão testados com tarefas e observação; nenhum valor de sucesso é declarado antes do estudo.

## 16. Checklist de entrega de tela

Objetivo, ação principal, hierarquia, estados, loading, vazio, erro, offline, confirmação, teclado, leitor de tela, contraste, movimento reduzido, analytics, performance, privacidade, teste e documentação.

## 17. Padrão implementado de aprendizagem imersiva

Os rótulos operacionais são Descobrir, Aprofundar e Conectar. A tela organiza a sequência curiosidade → objetivos → leitura guiada → ideias essenciais → mundo real → investigação → vídeo com missão → desafio → reflexão → diário → checklist → quiz. O aluno não recebe apenas uma resposta; recebe ações para pesquisar, comparar evidências, produzir e explicar.

O diário é salvo automaticamente no armazenamento local do dispositivo. A interface informa essa condição. Sincronização, leitura docente, moderação ou avaliação do texto exigem decisão pedagógica e análise LGPD antes de implementação.

Durante a geração, a tela informa prazo esperado de 30–90 s e descreve os blocos sendo preparados. O limite técnico do cliente é 180 s. O botão permanece em estado de carregamento para reduzir repetição acidental.
