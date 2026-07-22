# AISTUDYTEC — identidade e autorização

Versão 1.0 — 22 de julho de 2026

> Esta página descreve a baseline entregue. A arquitetura aprovada para o sistema completo de credenciais está em `docs/CREDENTIALS_IDENTITY.md`; os riscos abaixo não devem ser interpretados como capacidades já concluídas.

## Estratégia de sessão

- Sessão assinada pelo Flask em cookie `HttpOnly`.
- Duração configurável; padrão de oito horas.
- `SameSite=Lax` e `Secure` configuráveis por ambiente.
- CORS com credenciais somente para `ALLOWED_ORIGINS`.
- Senha e hash nunca retornam no JSON de login/sessão.
- `SESSION_SECRET` é obrigatório na implantação estável; sem ele, a chave efêmera invalida sessões após reinício.

## Matriz entregue nesta fatia

| Recurso | Estudante | Professor | Master |
|---|---|---|---|
| Próprio domínio/revisões/histórico | leitura | não | leitura administrativa |
| Domínio de outro estudante | não | não nesta rota | sim |
| Tentativa identificada em nome de outro usuário | não | não | sim |
| Turmas próprias | não | criar/listar | criar/listar todas |
| Estudantes da própria turma | não | leitura | leitura |
| Dashboard da própria turma | não | leitura | leitura |
| Dashboard de outro professor | não | não | leitura |
| Tópico publicado da turma | leitura | leitura | leitura |
| Rascunho/curadoria de tópico | não | somente tópico próprio | todos |
| Conteúdo livre identificado | somente próprio | não | leitura administrativa |
| Gerar, regenerar, editar e publicar | não | somente tópico próprio | todos |

IDs enviados pelo cliente são filtros e referências; não concedem acesso. A sessão é a fonte de identidade.

## Ameaças tratadas

- falsificação de `teacherId` na criação/listagem de turma;
- leitura horizontal de progresso por alteração de `userId`;
- submissão de tentativa em nome de outro estudante;
- leitura do dashboard e estudantes de turma pertencente a outro professor;
- leitura de rascunho ou edição/publicação de tópico pertencente a outro professor;
- falsificação de `teacherId`, `studentId` e `classId` na autoria de conteúdo;
- mutações de navegador com `Origin` externo à allowlist ou `Sec-Fetch-Site: cross-site`;
- exposição do hash de senha na resposta de login;
- permanência de sessão apenas em memória do React após recarregar.

## Riscos ainda bloqueadores para piloto externo

- cadastro público de estudante, ingresso por código e acesso a tópicos publicados exigem threat model específico para menores;
- a defesa CSRF atual usa SameSite + validação de origem; token anti-CSRF deve ser avaliado/concluído conforme topologia final de domínio/cookie;
- recuperação de senha, rotação de sessão, revogação central e trilha de auditoria não foram implementadas;
- SQLite não oferece armazenamento central de sessão/revogação para múltiplas instâncias;
- autorização precisa de E2E autenticado antes do piloto.

O sistema não deve ser exposto externamente enquanto os riscos bloqueadores restantes permanecerem.
