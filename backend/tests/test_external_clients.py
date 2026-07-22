import copy

import pytest

from gemini_client import _parse_generated_content
from youtube_client import _parse_iso8601_duration


def _valid_gemini_response():
    import json

    content = {
        "topic": "Funções",
        "explanations": {
            "simple": "Simples",
            "technical": "Técnica",
            "advanced": "Avançada",
        },
        "learningPaths": {
            level: {
                "hook": "Por que isso importa?",
                "objectives": ["Reconhecer o conceito", "Aplicar o conceito"],
                "keyIdeas": ["Ideia um", "Ideia dois", "Ideia três"],
                "realWorldConnection": "Conexão com uma situação cotidiana.",
                "guidedInvestigation": {
                    "question": "O que as evidências mostram?",
                    "steps": ["Consulte duas fontes", "Compare as evidências", "Registre a conclusão"],
                    "searchTerms": ["termo confiável um", "termo confiável dois"],
                },
                "watchMission": {
                    "before": "Faça uma previsão.",
                    "during": "Anote uma evidência.",
                    "after": "Explique com suas palavras.",
                },
                "handsOnChallenge": {
                    "title": "Teste na prática",
                    "instructions": "Produza um exemplo simples.",
                    "deliverable": "Um registro comentado.",
                },
                "reflectionQuestions": ["O que mudou?", "Que dúvida permanece?"],
                "discussionPrompt": "Defenda uma conclusão usando evidências.",
            }
            for level in ("simple", "technical", "advanced")
        },
        "questions": [
            {
                "question": f"Questão {index}",
                "options": ["A) Um", "B) Dois", "C) Três", "D) Quatro"],
                "correctOption": "A",
                "explanation": "Explicação",
                "skill": "Interpretar função",
                "difficulty": "medio",
            }
            for index in range(9)
        ],
    }
    return {"candidates": [{"content": {"parts": [{"text": json.dumps(content)}]}}]}


@pytest.mark.parametrize(
    ("value", "seconds"),
    [("PT5M", 300), ("PT1H2M3S", 3723), ("PT45S", 45), ("PT", 0), ("P1DT2H", 0), ("PT5Mgarbage", 0), (None, 0)],
)
def test_parse_iso8601_duration(value, seconds):
    assert _parse_iso8601_duration(value) == seconds


def test_parse_generated_content_accepts_expected_schema():
    parsed = _parse_generated_content(_valid_gemini_response())
    assert len(parsed["questions"]) == 9


@pytest.mark.parametrize("mutation", ["missing_content", "invalid_json", "missing_level", "too_few_questions", "bad_answer"])
def test_parse_generated_content_rejects_invalid_schema(mutation):
    response = copy.deepcopy(_valid_gemini_response())
    if mutation == "missing_content":
        response = {"candidates": []}
    elif mutation == "invalid_json":
        response["candidates"][0]["content"]["parts"][0]["text"] = "não é json"
    else:
        import json

        content = json.loads(response["candidates"][0]["content"]["parts"][0]["text"])
        if mutation == "missing_level":
            del content["explanations"]["advanced"]
        elif mutation == "too_few_questions":
            content["questions"] = content["questions"][:5]
        elif mutation == "bad_answer":
            content["questions"][0]["correctOption"] = "Z"
        response["candidates"][0]["content"]["parts"][0]["text"] = json.dumps(content)

    with pytest.raises(ValueError):
        _parse_generated_content(response)
