from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal

TaskType = Literal["reasoning", "generation", "retrieval", "classification", "prediction", "multimodal", "voice", "vision"]
LatencyPriority = Literal["realtime", "balanced", "background"]
PrivacySensitivity = Literal["public", "sensitive", "strict_sovereign"]
CostEnvelope = Literal["low_cost", "balanced", "high_performance"]
DomainHint = Literal["health", "education", "finance", "emotion", "general"]

class RouterRequest(BaseModel):
    prompt: str = Field(..., description="Prompt to send to the routed model")
    task_type: TaskType = Field("generation", description="Task classification category")
    latency_priority: LatencyPriority = Field("balanced", description="Latency requirements")
    privacy_sensitivity: PrivacySensitivity = Field("public", description="Data privacy classification level")
    cost_envelope: CostEnvelope = Field("balanced", description="Cost/Performance budget setting")
    domain: DomainHint = Field("general", description="Domain hint for fine-tuned model routing (health, education, finance, emotion)")
    user_id: Optional[str] = Field(None, description="Identifier of the user for tracing and auditing")

class TokensUsed(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

class RouterResponse(BaseModel):
    routed_model: str = Field(..., description="Name of the model selected and queried")
    provider: str = Field(..., description="Model provider (e.g., openai, google, anthropic, local, nexus)")
    response_text: str = Field(..., description="Text response from the model")
    latency_ms: float = Field(..., description="Time taken to complete request in milliseconds")
    tokens_used: TokensUsed = Field(default_factory=TokensUsed, description="Details of tokens consumed")
    cost_usd: float = Field(..., description="Estimated cost of the query in USD")
    explainability_summary: str = Field(..., description="Summary explanation of the model selection decision")
    fallback_triggered: bool = Field(False, description="True if primary model failed and fallback was used")

class EdgeModelInfo(BaseModel):
    model_id: str = Field(..., description="Unique identifier for the edge model")
    display_name: str = Field(..., description="Human-readable name")
    version: str = Field(..., description="Semantic version of the distilled model")
    domain: str = Field(..., description="Domain this edge model serves")
    size_mb: float = Field(..., description="Download size in megabytes")
    use_cases: List[str] = Field(default_factory=list, description="Primary use cases for this edge model")

class EdgeModelsResponse(BaseModel):
    models: List[EdgeModelInfo] = Field(default_factory=list)
    total: int = Field(0)

# ── Chain Routing Schemas ────────────────────────────────────────────

class ChainStepInput(BaseModel):
    step_name: str = Field(..., description="Name for this chain step")
    model: str = Field(..., description="Model to use for this step")
    provider: str = Field(..., description="Provider for this step")
    prompt_template: str = Field(..., description="Prompt template with {input} placeholder for previous step output")
    temperature: float = Field(0.7, description="Temperature for this step")

class ChainRouteRequest(BaseModel):
    prompt: str = Field(..., description="Original prompt to feed into the chain")
    chain_name: str = Field(..., description="Name of a pre-defined chain template (e.g. 'retrieval_then_reasoning') or 'custom'")
    custom_steps: Optional[List[ChainStepInput]] = Field(None, description="Custom chain steps (required when chain_name='custom')")
    user_id: Optional[str] = Field(None, description="User identifier for audit trail")

class ChainStepDetail(BaseModel):
    step_index: int
    step_name: str
    model: str
    provider: str
    latency_ms: float
    tokens: Dict
    cost_usd: float
    output_preview: str

class ChainRouteResponse(BaseModel):
    chain_name: str = Field(..., description="Name of the executed chain")
    final_output: str = Field(..., description="Final output from the last step in the chain")
    steps_completed: int = Field(..., description="Number of steps completed")
    total_latency_ms: float = Field(..., description="Total chain execution time in ms")
    total_tokens: Dict = Field(default_factory=dict, description="Aggregated token usage")
    total_cost_usd: float = Field(..., description="Total cost across all steps")
    step_details: List[ChainStepDetail] = Field(default_factory=list, description="Per-step execution details")

# ── Load Balancer Stats Schema ───────────────────────────────────────

class InstanceStats(BaseModel):
    instance_id: str
    healthy: bool
    weight: int
    total_requests: int
    total_failures: int

class PoolStats(BaseModel):
    provider: str
    total_instances: int
    healthy_instances: int
    instances: List[InstanceStats]

class LoadBalancerStatsResponse(BaseModel):
    pools: List[PoolStats] = Field(default_factory=list)
