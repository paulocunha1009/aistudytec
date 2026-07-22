import os
import json
import requests

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

QUESTION_COUNT = 9  # dentro da faixa 8-10 confirmada com o professor
EXPLANATION_LEVELS = ('simple', 'technical', 'advanced')
VALID_DIFFICULTIES = {'facil', 'medio', 'dificil'}
PATH_REQUIRED_STRINGS = ('hook', 'realWorldConnection', 'discussionPrompt')


def _validate_learning_path(level, path):
    if not isinstance(path, dict) or any(
        not isinstance(path.get(field), str) or not path[field].strip()
        for field in PATH_REQUIRED_STRINGS
    ):
        raise ValueError(f"Trilha {level} está incompleta")
    for field, minimum in (('objectives', 2), ('keyIdeas', 3), ('reflectionQuestions', 2)):
        values = path.get(field)
        if not isinstance(values, list) or len(values) < minimum or not all(
            isinstance(value, str) and value.strip() for value in values
        ):
            raise ValueError(f"Trilha {level} não contém {field} válidos")
    investigation = path.get('guidedInvestigation')
    if not isinstance(investigation, dict) or not isinstance(investigation.get('question'), str):
        raise ValueError(f"Trilha {level} não contém investigação guiada")
    for field in ('steps', 'searchTerms'):
        if not isinstance(investigation.get(field), list) or len(investigation[field]) < 2:
            raise ValueError(f"Investigação da trilha {level} está incompleta")
    mission = path.get('watchMission')
    if not isinstance(mission, dict) or any(
        not isinstance(mission.get(field), str) or not mission[field].strip()
        for field in ('before', 'during', 'after')
    ):
        raise ValueError(f"Missão de vídeo da trilha {level} está incompleta")
    challenge = path.get('handsOnChallenge')
    if not isinstance(challenge, dict) or any(
        not isinstance(challenge.get(field), str) or not challenge[field].strip()
        for field in ('title', 'instructions', 'deliverable')
    ):
        raise ValueError(f"Desafio prático da trilha {level} está incompleto")


def _parse_generated_content(data):
    try:
        text = data['candidates'][0]['content']['parts'][0]['text']
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError("Resposta do Gemini sem conteúdo gerado") from exc

    try:
        content = json.loads(text)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ValueError("Resposta do Gemini não contém JSON válido") from exc

    explanations = content.get('explanations')
    learning_paths = content.get('learningPaths')
    questions = content.get('questions')
    if not isinstance(explanations, dict) or any(
        not isinstance(explanations.get(level), str) or not explanations[level].strip()
        for level in EXPLANATION_LEVELS
    ):
        raise ValueError("Resposta do Gemini não contém as três explicações obrigatórias")
    if not isinstance(learning_paths, dict):
        raise ValueError("Resposta do Gemini não contém trilhas de aprendizagem")
    for level in EXPLANATION_LEVELS:
        _validate_learning_path(level, learning_paths.get(level))
    if not isinstance(questions, list) or not 8 <= len(questions) <= 10:
        raise ValueError("Resposta do Gemini deve conter de 8 a 10 questões")

    for index, question in enumerate(questions, start=1):
        required_strings = ('question', 'correctOption', 'explanation', 'skill', 'difficulty')
        if not isinstance(question, dict) or any(
            not isinstance(question.get(field), str) or not question[field].strip()
            for field in required_strings
        ):
            raise ValueError(f"Questão {index} está incompleta")
        options = question.get('options')
        if not isinstance(options, list) or len(options) < 2 or not all(isinstance(o, str) and o.strip() for o in options):
            raise ValueError(f"Questão {index} não contém opções válidas")
        valid_options = {chr(ord('A') + option_index) for option_index in range(len(options))}
        if question['correctOption'].strip().upper() not in valid_options:
            raise ValueError(f"Questão {index} possui resposta correta inválida")
        question['correctOption'] = question['correctOption'].strip().upper()
        if question['difficulty'] not in VALID_DIFFICULTIES:
            raise ValueError(f"Questão {index} possui dificuldade inválida")

    return content

def _grade_instructions(target_grade):
    if target_grade == '3':
        return ("Questões no estilo ENEM: contextualizadas, com um pequeno texto/cenário de apoio, "
                "exigindo interpretação e raciocínio em mais de uma etapa, evitando decoreba.")
    if target_grade in ('1', '2'):
        return ("Questões de consolidação de base: diretas, focadas em fixar o conceito fundamental, "
                "com progressão de dificuldade suave.")
    return "Mescle questões diretas e questões contextualizadas de raciocínio, de forma equilibrada."

def generate_topic_content(title, target_grade='any'):
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY não configurada no backend (.env)")

    prompt = f"""Você é um especialista em pedagogia para o Ensino Médio brasileiro.
Gere um JSON (e SOMENTE o JSON, sem texto ao redor) sobre o tema "{title}" com esta estrutura exata:

{{
  "topic": "string",
  "explanations": {{
    "simple": "explicação simples detalhada, com analogias e linguagem acessível",
    "technical": "explicação técnica detalhada, com terminologia definida em contexto",
    "advanced": "explicação avançada detalhada, conectando aplicações, limites e casos complexos"
  }},
  "learningPaths": {{
    "simple": {{
      "hook": "pergunta provocadora que desperta curiosidade",
      "objectives": ["2 a 4 objetivos observáveis"],
      "keyIdeas": ["3 a 5 ideias essenciais, uma por item, explicadas com clareza"],
      "realWorldConnection": "exemplo concreto e verificável do cotidiano",
      "guidedInvestigation": {{
        "question": "pergunta investigável que não seja respondida de imediato",
        "steps": ["3 passos para pesquisar, comparar evidências e registrar conclusão"],
        "searchTerms": ["2 a 4 termos de busca específicos"]
      }},
      "watchMission": {{
        "before": "o que prever antes do vídeo",
        "during": "o que observar e anotar",
        "after": "o que explicar com as próprias palavras"
      }},
      "handsOnChallenge": {{
        "title": "desafio curto e seguro",
        "instructions": "instrução executável em casa ou na escola, sem exigir materiais especiais",
        "deliverable": "evidência concreta que o aluno deve produzir"
      }},
      "reflectionQuestions": ["2 a 3 perguntas abertas de reflexão"],
      "discussionPrompt": "provocação para o aluno defender uma ideia com evidências"
    }},
    "technical": "objeto com a mesma estrutura de simple e profundidade técnica intermediária",
    "advanced": "objeto com a mesma estrutura de simple, análise, limites, trade-offs e conexões interdisciplinares"
  }},
  "questions": [
    {{
      "question": "string",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctOption": "A",
      "explanation": "por que essa é a resposta certa (vira o feedback mostrado ao aluno)",
      "skill": "habilidade específica avaliada, granular (ex: 'interpretar gráfico de função afim'), nunca apenas o tema genérico",
      "difficulty": "facil ou medio ou dificil"
    }}
  ]
}}

Gere exatamente {QUESTION_COUNT} questões. {_grade_instructions(target_grade)}
Cada questão deve mirar uma habilidade específica o suficiente para diagnosticar exatamente onde o aluno erra, não apenas repetir o tema geral.
As três learningPaths DEVEM ser objetos completos com todos os mesmos campos demonstrados em simple. Não invente estatísticas, fontes ou links. A investigação deve ensinar o aluno a comparar pelo menos duas fontes confiáveis e registrar evidências."""

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "maxOutputTokens": 20000,
            "temperature": 0.55,
        },
    }
    last_error = None
    for _attempt in range(2):
        resp = requests.post(f"{GEMINI_URL}?key={api_key}", json=body, timeout=90)
        resp.raise_for_status()
        try:
            return _parse_generated_content(resp.json())
        except ValueError as exc:
            last_error = exc
    raise last_error
