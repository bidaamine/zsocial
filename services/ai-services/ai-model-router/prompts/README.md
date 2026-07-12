# AI Model Router — Prompts

## Purpose

System prompt templates and pre-processing rules for the AI Model Router. These are used to prefix or modify user prompts before sending them to downstream LLM providers.

## Current Implementation

The current implementation passes prompts directly to providers without system prompt injection. The routing logic is handled entirely by the classifier engine (`src/classifier.py`).

## Future Prompt Templates
- **Safety wrapper**: Prefix for child-related queries ensuring age-appropriate language
- **Health disclaimer**: Suffix for medical queries adding "consult a professional" disclaimer
- **Corporate context**: System prompt injecting company knowledge base context
- **Education scaffolding**: Socratic method system prompt for tutoring sessions
- **Emotional awareness**: System prompt instructing the model to acknowledge emotional state
- **Sovereignty notice**: Prompt prefix for strict_sovereign routing explaining data locality
