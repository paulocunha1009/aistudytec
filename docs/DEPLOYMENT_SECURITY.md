# Checklist de configuração segura para implantação

Nunca envie `backend/.env` ao Git nem copie suas chaves para frontend, imagem Docker, logs ou documentação. Em produção, cadastre os valores no painel de variáveis secretas da hospedagem.

## Variáveis obrigatórias

```text
APP_ENV=production
ADMIN_USERNAME=master
ADMIN_PASSWORD=<segredo forte do gerenciador da hospedagem>
SESSION_SECRET=<48 bytes aleatórios ou mais>
GEMINI_API_KEY=<segredo>
YOUTUBE_API_KEY=<segredo>
ALLOWED_ORIGINS=https://dominio-real-do-frontend
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=Lax
SESSION_HOURS=8
RATELIMIT_STORAGE_URI=redis://...
```

O processo se recusa a iniciar em `production` quando administrador, segredo de sessão, domínio HTTPS, cookie seguro ou rate limit compartilhado estão ausentes/inseguros.

## Primeiro deploy

1. Criar banco persistente fora do filesystem efêmero do container.
2. Configurar todas as variáveis no secret manager.
3. Executar `init_db()` uma vez; o master será criado com senha em hash.
4. Reiniciar a aplicação e confirmar login, cookie `Secure` e origem permitida.
5. Confirmar que `.env`, banco e logs não fazem parte do artefato público.
6. Criar backup antes de migração ou troca de versão.

## Rotação

Trocar `ADMIN_PASSWORD` no secret manager e reiniciar executa novo hash no master existente. Trocar `SESSION_SECRET` encerra sessões atuais; planejar janela de manutenção. Chaves vazadas devem ser revogadas no provedor, não apenas removidas do arquivo local.

## Limites atuais

Antes de exposição pública ainda são necessários HTTPS real, armazenamento persistente, Redis para rate limit, backup/restauração demonstrados, migrações versionadas, E2E autenticado e revisão LGPD.
