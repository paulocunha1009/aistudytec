# Contratos MCP

## Princípios

- Preferir recursos para leitura e ferramentas para ações parametrizadas.
- Definir schemas fechados, campos mínimos e identificadores estáveis.
- Retornar dados estruturados; reservar texto para resumo humano.
- Separar consultar, gerar, revisar e publicar.
- Exigir confirmação para publicar, arquivar ou alterar dados pedagógicos.
- Nunca retornar chaves, hashes de senha ou variáveis de ambiente.

## Candidatos priorizados

1. `aistudytec_get_class_overview`.
2. `aistudytec_get_topic_review`.
3. `aistudytec_create_topic_draft`.
4. `aistudytec_generate_topic`.
5. `aistudytec_publish_topic`.
6. `aistudytec_get_student_review_queue`.

## Envelope de erro

```json
{
  "error": {
    "code": "TOPIC_INCOMPLETE",
    "message": "Tópico incompleto para publicação",
    "details": {"missing": []},
    "retryable": false
  }
}
```

Não expor MCP publicamente antes de aprovar identidade e autorização.
