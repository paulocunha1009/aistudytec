# AISTUDYTEC — arquitetura de identidade e credenciais

Versão 1.0 — 22 de julho de 2026  
Status: arquitetura final Supabase aprovada; implementação e implantação verificadas são obrigatórias antes do piloto externo.

> A implementação definitiva usa Supabase Auth, PostgreSQL/RLS e MFA nativo. As tabelas de credenciais e sessões descritas originalmente nesta página representam responsabilidades do domínio, não autorização para duplicar em código próprio aquilo que o Supabase Auth já mantém. A topologia normativa está em `docs/PRODUCTION_ARCHITECTURE_SUPABASE_VERCEL.md`.

## Objetivo

Tratar identidade como domínio crítico do produto. A conta `master` não é uma senha universal: é uma identidade administrativa nominal, sujeita a autenticação reforçada, menor privilégio, sessões revogáveis e auditoria.

História principal: como responsável pela plataforma, quero controlar todo o ciclo de vida de contas, credenciais e sessões, para operar o AISTUDYTEC sem expor estudantes, professores ou segredos do sistema.

## Princípios

- senha nunca é armazenada, registrada em log ou retornada; somente hash resistente;
- respostas de login não revelam se o usuário existe;
- identidade vem da sessão validada, nunca de IDs enviados pelo navegador;
- `master` usa MFA obrigatório e não compartilha conta;
- sessões possuem identificador próprio, expiração, rotação e revogação;
- recuperação usa token aleatório, de uso único, com hash e validade curta;
- permissões são explícitas e verificadas também no recurso;
- eventos críticos são auditados com minimização de dados;
- nenhuma credencial real é mantida no repositório;
- mudanças preservam contas existentes e permitem migração progressiva de hashes.

## Modelo-alvo

### Conta

Estado: `pending`, `active`, `locked`, `disabled` ou `deleted`. A conta mantém identidade e perfil; a credencial fica separada. Desabilitar uma conta revoga todas as sessões.

### Credencial de senha

Supabase Auth será a autoridade da senha e de sua política. Hashes Werkzeug existentes não serão copiados para tabelas públicas nem validados pelo frontend. Usuários existentes passarão por fluxo controlado de convite/definição de senha ou migração suportada e testada antes do corte; nenhuma senha em texto será criada ou exportada.

### Papéis e permissões

Papéis iniciais: `student`, `teacher` e `master`. Permissões devem ser centralizadas, mas propriedade continua obrigatória: professor só administra suas turmas e tópicos; estudante só acessa seus próprios dados; master possui capacidade administrativa global, não acesso silencioso.

### Sessão

Supabase Auth emitirá access token curto e refresh token rotativo, mantendo as sessões no serviço de autenticação. O aplicativo implementará PKCE, encerramento e controles de sessão compatíveis com sua arquitetura web. Ações sensíveis verificarão sessão válida, `session_id`, nível AAL e autenticação recente.

### MFA

TOTP é o primeiro fator adicional, com segredo gerido pelo Supabase Auth e fora de logs. MFA é obrigatório para `master`, recomendado para professor e opcional para estudante. O Supabase não oferece códigos de recuperação TOTP; recuperação usa segundo fator verificado e procedimento administrativo auditado. WebAuthn/passkeys é a evolução preferencial após validação de domínio HTTPS e suporte dos dispositivos do piloto.

### Recuperação e convite

Tokens de convite, definição e recuperação de senha são aleatórios, de uso único, expiram e ficam armazenados somente como hash. A resposta pública é neutra. O envio de e-mail depende de provedor transacional aprovado; em desenvolvimento, o token pode ser capturado somente por adaptador de teste, nunca por log de produção.

### Defesa contra abuso

Rate limit por origem e identificador normalizado, atraso progressivo, bloqueio temporário e alerta para eventos anormais. Não usar bloqueio permanente automático que permita negação de serviço contra uma vítima. Sucesso limpa a contagem aplicável; falhas e desbloqueios são auditados.

### CSRF e ações sensíveis

Além de `SameSite` e validação de origem, mutações autenticadas terão token CSRF ligado à sessão. Troca de senha, MFA, e-mail, papel, desativação e ações administrativas exigem autenticação recente; ações master de maior risco exigem MFA confirmado.

## Dados previstos

- `auth.users`, `auth.sessions` e fatores MFA: geridos exclusivamente pelo Supabase Auth;
- `profiles`: papel, estado e dados mínimos ligados a `auth.users`;
- `mfa_factors`: tipo, segredo protegido, confirmação e revogação;
- `mfa_recovery_codes`: código em hash, consumo e validade;
- `password_action_tokens`: finalidade, token em hash, expiração e consumo;
- `roles`, `permissions` e associações, introduzidas sem remover imediatamente `users.type`;
- `audit_events`: login, falha, bloqueio, recuperação, MFA, sessão, papel e conta.

Não registrar senha, token, segredo TOTP, código de recuperação, conteúdo de cookie ou chave de API.

## Plano de migração

1. Criar tabelas e estados idempotentes; importar referências às contas sem copiar senha em texto.
2. Aplicar política, normalização, bloqueio temporário e rehash oportunista mantendo o login atual compatível.
3. Substituir a sessão assinada autocontida por sessão opaca revogável e adicionar CSRF.
4. Entregar gestão de sessões, troca e recuperação de senha.
5. Entregar TOTP, segundo fator de recuperação e procedimento administrativo auditado; tornar MFA obrigatório para `master`.
6. Centralizar permissões, console administrativo e testes E2E negativos.
7. Remover compatibilidades antigas somente após migração observada e backup validado.

## Critérios de aceite do épico

- conta master é provisionada uma única vez e a senha de bootstrap não é necessária em reinícios;
- senha inicial é trocada antes da operação externa e MFA do master está confirmado;
- cinco falhas não permitem tentativas ilimitadas e não revelam existência da conta;
- alteração de senha revoga as demais sessões;
- recuperação expira, é de uso único e não expõe token em banco ou log;
- cada dispositivo pode ser identificado e revogado pelo usuário;
- ações administrativas sensíveis exigem autenticação recente e são auditadas;
- testes cobrem acesso horizontal, escalada de papel, replay, CSRF, expiração e revogação;
- backup/restauração preserva identidade e não reativa sessão revogada;
- nenhum segredo aparece em Git, resposta HTTP ou logs.

## Limites e decisões pendentes

- escolher provedor de e-mail e política de retenção antes da recuperação real;
- validar base legal, consentimento e fluxo de responsáveis para menores antes do cadastro público;
- validar armazenamento compartilhado e banco de produção antes de múltiplas instâncias;
- WebAuthn depende de domínio HTTPS estável; não será simulado localmente como concluído.
