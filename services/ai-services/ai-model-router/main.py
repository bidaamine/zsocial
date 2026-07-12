import time
import uvicorn
import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks
from src.config import settings
from src.models import (
    RouterRequest, RouterResponse, TokensUsed, EdgeModelInfo, EdgeModelsResponse,
    ChainRouteRequest, ChainRouteResponse, LoadBalancerStatsResponse, PoolStats, InstanceStats
)
from src.classifier import classify_and_route
from src.providers import call_llm
from src.metrics import calculate_cost, dispatch_compliance_audit_log
from src.load_balancer import get_load_balancer
from src.chain_router import execute_chain, list_chain_templates, ChainStep
from src.routing_table import get_routing_table, reload_routing_table

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai-model-router")

app = FastAPI(
    title="NEXUS AI Model Router Service",
    description="Intelligently routes AI requests based on task types, latency constraints, cost, and privacy sensitivity.",
    version="1.0.0"
)

@app.get("/health")
async def health_check():
    """
    Standard microservice health check.
    """
    return {
        "status": "healthy",
        "service": "ai-model-router",
        "environment": settings.ENV,
        "port": settings.PORT
    }

# Edge model registry (PDF spec lines 662-666)
# "Edge Models run locally on user devices for three critical use cases:
# real-time emotional state detection, offline functionality, and biometric processing.
# Edge models are distilled versions of cloud models, updated via silent background sync."
EDGE_MODEL_REGISTRY = [
    EdgeModelInfo(
        model_id="nexus-edge-emotion-v1",
        display_name="Emotion Detection (Edge)",
        version="1.0.0",
        domain="emotion",
        size_mb=45.2,
        use_cases=["real-time emotional state detection", "privacy-sensitive mood analysis", "adaptive UX triggers"]
    ),
    EdgeModelInfo(
        model_id="nexus-edge-offline-v1",
        display_name="Offline Life Manager (Edge)",
        version="1.0.0",
        domain="general",
        size_mb=120.5,
        use_cases=["offline functionality", "basic life management without connectivity", "task scheduling"]
    ),
    EdgeModelInfo(
        model_id="nexus-edge-biometric-v1",
        display_name="Biometric Processor (Edge)",
        version="1.0.0",
        domain="health",
        size_mb=32.8,
        use_cases=["wearable data processing", "HRV analysis", "on-device biometric signals before transmission"]
    ),
    EdgeModelInfo(
        model_id="nexus-edge-child-safety-v1",
        display_name="Child Safety Scanner (Edge)",
        version="1.0.0",
        domain="education",
        size_mb=28.1,
        use_cases=["on-device content age-gating", "real-time child safety filtering", "offline minor protection"]
    ),
]

@app.get("/edge-models", response_model=EdgeModelsResponse)
async def list_edge_models():
    """
    Returns the registry of available edge/on-device models.
    Mobile and desktop clients consume this to know which distilled models
    to download and cache locally for offline and privacy-critical use cases.
    """
    return EdgeModelsResponse(
        models=EDGE_MODEL_REGISTRY,
        total=len(EDGE_MODEL_REGISTRY)
    )

@app.post("/route", response_model=RouterResponse)
async def route_request(request: RouterRequest, background_tasks: BackgroundTasks):
    """
    Classifies a request and routes it to the optimal provider.
    Automatically handles provider failovers and dispatches compliance auditing logs.
    """
    start_time = time.time()
    
    # 1. Determine optimal models using classification rules
    decision = classify_and_route(request)
    
    response_text = ""
    tokens = TokensUsed()
    fallback_triggered = False
    routed_model = decision.primary_model
    routed_provider = decision.primary_provider
    
    # 2. Attempt primary routing
    try:
        response_text, tokens = await call_llm(
            model=decision.primary_model,
            provider=decision.primary_provider,
            prompt=request.prompt
        )
    except Exception as e:
        logger.warning(
            f"Primary routing failed for model {decision.primary_model} on {decision.primary_provider}: {str(e)}. "
            f"Attempting fallback to {decision.fallback_model} on {decision.fallback_provider}."
        )
        fallback_triggered = True
        routed_model = decision.fallback_model
        routed_provider = decision.fallback_provider
        
        # 3. Fallback execution
        try:
            response_text, tokens = await call_llm(
                model=decision.fallback_model,
                provider=decision.fallback_provider,
                prompt=request.prompt
            )
        except Exception as fallback_err:
            logger.error(f"Fallback routing failed: {str(fallback_err)}")
            raise HTTPException(
                status_code=502,
                detail=f"AI model routing failed on both primary and fallback providers. Error: {str(fallback_err)}"
            )

    latency_ms = (time.time() - start_time) * 1000
    cost = calculate_cost(routed_model, tokens)
    
    # 4. Asynchronously dispatch compliance logs to avoid blocking client response
    background_tasks.add_task(
        dispatch_compliance_audit_log,
        user_id=request.user_id,
        prompt=request.prompt,
        routed_model=routed_model,
        provider=routed_provider,
        latency_ms=latency_ms,
        tokens=tokens,
        cost_usd=cost,
        justification=decision.justification,
        fallback_triggered=fallback_triggered
    )
    
    return RouterResponse(
        routed_model=routed_model,
        provider=routed_provider,
        response_text=response_text,
        latency_ms=round(latency_ms, 2),
        tokens_used=tokens,
        cost_usd=cost,
        explainability_summary=decision.justification,
        fallback_triggered=fallback_triggered
    )

@app.get("/route/chains")
async def list_chains():
    """
    Lists all pre-defined multi-model chain templates available.
    """
    return list_chain_templates()

@app.post("/route/chain", response_model=ChainRouteResponse)
async def route_chain_request(request: ChainRouteRequest, background_tasks: BackgroundTasks):
    """
    Executes a multi-model pipeline chain (combination of models).
    """
    custom_steps = None
    if request.chain_name == "custom":
        if not request.custom_steps:
            raise HTTPException(status_code=400, detail="custom_steps is required when chain_name is 'custom'")
        custom_steps = [
            ChainStep(
                step_name=s.step_name,
                model=s.model,
                provider=s.provider,
                prompt_template=s.prompt_template,
                temperature=s.temperature
            )
            for s in request.custom_steps
        ]
    
    try:
        result = await execute_chain(
            chain_name=request.chain_name,
            original_prompt=request.prompt,
            call_llm_fn=call_llm,
            calculate_cost_fn=calculate_cost,
            custom_steps=custom_steps
        )
    except Exception as e:
        logger.error(f"Chain routing execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chain routing execution failed: {str(e)}")

    # Dispatch compliance audit log for the final outcome of the chain
    background_tasks.add_task(
        dispatch_compliance_audit_log,
        user_id=request.user_id,
        prompt=request.prompt,
        routed_model=f"chain-{request.chain_name}",
        provider="multi-provider",
        latency_ms=result.total_latency_ms,
        tokens=result.total_tokens,
        cost_usd=result.total_cost_usd,
        justification=f"Executed multi-model chain pipeline '{request.chain_name}' with {result.steps_completed} steps.",
        fallback_triggered=False
    )

    return ChainRouteResponse(
        chain_name=result.chain_name,
        final_output=result.final_output,
        steps_completed=result.steps_completed,
        total_latency_ms=result.total_latency_ms,
        total_tokens={
            "prompt_tokens": result.total_tokens.prompt_tokens,
            "completion_tokens": result.total_tokens.completion_tokens,
            "total_tokens": result.total_tokens.total_tokens
        },
        total_cost_usd=result.total_cost_usd,
        step_details=result.step_details
    )

@app.get("/admin/load-balancer", response_model=LoadBalancerStatsResponse)
async def get_load_balancer_stats():
    """
    Returns statistics and health status of all provider instances in the load balancer.
    """
    lb = get_load_balancer()
    stats = lb.get_all_stats()
    pools = []
    for p in stats:
        instances = [
            InstanceStats(
                instance_id=i["instance_id"],
                healthy=i["healthy"],
                weight=i["weight"],
                total_requests=i["total_requests"],
                total_failures=i["total_failures"]
            )
            for i in p["instances"]
        ]
        pools.append(
            PoolStats(
                provider=p["provider"],
                total_instances=p["total_instances"],
                healthy_instances=p["healthy_instances"],
                instances=instances
            )
        )
    return LoadBalancerStatsResponse(pools=pools)

@app.get("/admin/routing-table")
async def get_current_routing_table():
    """
    Returns the currently active routing table.
    """
    return get_routing_table()

@app.post("/admin/routing-table/reload")
async def reload_current_routing_table():
    """
    Hot-reloads the routing table from disk config file.
    """
    reload_routing_table()
    return {"status": "success", "message": "Routing table successfully reloaded from config file"}

if __name__ == "__main__":
    logger.info(f"Starting NEXUS AI Model Router on {settings.HOST}:{settings.PORT}")
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
