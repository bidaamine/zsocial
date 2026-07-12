import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_endpoint():
    """
    Test standard health check endpoint.
    """
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-model-router"

def test_routing_strict_sovereign_privacy():
    """
    Test that strict_sovereign privacy sensitivity forces local-sovereign-phi3 model on local provider.
    """
    payload = {
        "prompt": "Test query containing sensitive health details",
        "task_type": "reasoning",
        "latency_priority": "balanced",
        "privacy_sensitivity": "strict_sovereign",
        "cost_envelope": "high_performance",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "local-sovereign-phi3"
    assert data["provider"] == "local"
    assert "strict children and health sovereignty constraints" in data["explainability_summary"]
    assert data["fallback_triggered"] is False

def test_routing_reasoning_high_performance():
    """
    Test reasoning task type with high performance cost budget.
    """
    payload = {
        "prompt": "Calculate mathematical optimum of asset allocation",
        "task_type": "reasoning",
        "latency_priority": "balanced",
        "privacy_sensitivity": "public",
        "cost_envelope": "high_performance",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "gpt-4o"
    assert data["provider"] == "openai"
    assert data["cost_usd"] > 0
    assert data["fallback_triggered"] is False

def test_routing_reasoning_low_cost():
    """
    Test reasoning task type with low cost budget.
    """
    payload = {
        "prompt": "Find answer to general mathematical logic problem",
        "task_type": "reasoning",
        "latency_priority": "balanced",
        "privacy_sensitivity": "public",
        "cost_envelope": "low_cost",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "gemini-1.5-flash"
    assert data["provider"] == "google"
    assert data["fallback_triggered"] is False

def test_routing_realtime_latency():
    """
    Test that realtime latency priority routes to low latency model (gpt-4o-mini).
    """
    payload = {
        "prompt": "Answer a chat message immediately",
        "task_type": "generation",
        "latency_priority": "realtime",
        "privacy_sensitivity": "public",
        "cost_envelope": "balanced",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "gpt-4o-mini"
    assert data["provider"] == "openai"
    assert data["fallback_triggered"] is False

def test_routing_failover_mechanism():
    """
    Test failover execution triggers correctly and completes via fallback provider
    when prompt contains FORCE_FAILOVER keyword.
    """
    payload = {
        "prompt": "Calculate mathematical optimization with FORCE_FAILOVER trigger",
        "task_type": "reasoning",
        "latency_priority": "balanced",
        "privacy_sensitivity": "public",
        "cost_envelope": "high_performance",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Primary was gpt-4o (openai). Fallback is claude-3-5-sonnet (anthropic)
    assert data["routed_model"] == "claude-3-5-sonnet"
    assert data["provider"] == "anthropic"
    assert data["fallback_triggered"] is True

def test_routing_domain_health_fine_tuned():
    """
    Test that domain='health' routes to the NEXUS fine-tuned health model.
    PDF spec: "a health AI model trained on validated medical knowledge"
    """
    payload = {
        "prompt": "Analyze my HRV trend and suggest recovery protocol",
        "task_type": "reasoning",
        "latency_priority": "balanced",
        "privacy_sensitivity": "public",
        "cost_envelope": "balanced",
        "domain": "health",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "nexus-health-ft"
    assert data["provider"] == "nexus"
    assert "fine-tuned model" in data["explainability_summary"]

def test_routing_domain_education_fine_tuned():
    """
    Test that domain='education' routes to the NEXUS fine-tuned education model.
    PDF spec: "an education AI trained on pedagogical frameworks"
    """
    payload = {
        "prompt": "Create an adaptive lesson plan for a 9 year old struggling with fractions",
        "task_type": "generation",
        "latency_priority": "balanced",
        "privacy_sensitivity": "public",
        "cost_envelope": "balanced",
        "domain": "education",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "nexus-education-ft"
    assert data["provider"] == "nexus"

def test_routing_domain_finance_fine_tuned():
    """
    Test that domain='finance' routes to the NEXUS fine-tuned finance model.
    PDF spec: "a financial AI trained on accounting principles and market dynamics"
    """
    payload = {
        "prompt": "Model cash flow scenarios for Q3 given delayed invoice payments",
        "task_type": "prediction",
        "latency_priority": "balanced",
        "privacy_sensitivity": "public",
        "cost_envelope": "high_performance",
        "domain": "finance",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "nexus-finance-ft"
    assert data["provider"] == "nexus"

def test_routing_domain_emotion_fine_tuned():
    """
    Test that domain='emotion' routes to the NEXUS fine-tuned emotion model.
    PDF spec: "an emotional AI trained on psychologically validated emotional recognition datasets"
    """
    payload = {
        "prompt": "Classify emotional state from recent text interaction patterns",
        "task_type": "classification",
        "latency_priority": "balanced",
        "privacy_sensitivity": "public",
        "cost_envelope": "balanced",
        "domain": "emotion",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "nexus-emotion-ft"
    assert data["provider"] == "nexus"

def test_sovereign_overrides_domain():
    """
    Test that strict_sovereign privacy ALWAYS wins over domain fine-tuned routing.
    Even if domain='health', strict_sovereign must force local model.
    """
    payload = {
        "prompt": "Analyze child patient health data",
        "task_type": "reasoning",
        "latency_priority": "balanced",
        "privacy_sensitivity": "strict_sovereign",
        "cost_envelope": "high_performance",
        "domain": "health",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["routed_model"] == "local-sovereign-phi3"
    assert data["provider"] == "local"

def test_edge_models_endpoint():
    """
    Test the /edge-models registry endpoint.
    PDF spec: "Edge Models run locally on user devices for three critical use cases:
    real-time emotional state detection, offline functionality, and biometric processing."
    """
    response = client.get("/edge-models")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 4
    model_ids = [m["model_id"] for m in data["models"]]
    assert "nexus-edge-emotion-v1" in model_ids
    assert "nexus-edge-offline-v1" in model_ids
    assert "nexus-edge-biometric-v1" in model_ids
    assert "nexus-edge-child-safety-v1" in model_ids

def test_general_domain_skips_fine_tuned():
    """
    Test that domain='general' (default) does NOT route to fine-tuned models
    and falls through to standard classifier logic.
    """
    payload = {
        "prompt": "Write a blog post about productivity tips",
        "task_type": "generation",
        "latency_priority": "balanced",
        "privacy_sensitivity": "public",
        "cost_envelope": "balanced",
        "domain": "general",
        "user_id": "user_123"
    }
    response = client.post("/route", json=payload)
    assert response.status_code == 200
    data = response.json()
    # Should NOT be routed to any nexus fine-tuned model
    assert not data["routed_model"].startswith("nexus-")
    assert data["provider"] != "nexus"

def test_configurable_routing_table(tmp_path):
    """
    Test that the configurable routing table can load a custom JSON table
    and classify/route requests accordingly.
    """
    import os
    import json
    from src.routing_table import reload_routing_table, get_routing_table, lookup_candidates
    
    custom_table = {
        "reasoning": {
            "high_performance": [["custom-reasoning-model", "openai"], ["fallback-custom-model", "anthropic"]]
        }
    }
    
    # Write custom routing table to temp directory
    config_dir = tmp_path / "config"
    config_dir.mkdir()
    config_file = config_dir / "routing_table.json"
    with open(config_file, "w") as f:
        json.dump(custom_table, f)
        
    # Set env var
    os.environ["ROUTING_TABLE_PATH"] = str(config_file)
    try:
        reload_routing_table()
        candidates = lookup_candidates("reasoning", "high_performance")
        assert candidates[0] == ("custom-reasoning-model", "openai")
        assert candidates[1] == ("fallback-custom-model", "anthropic")
        
        # Test routing request integration
        payload = {
            "prompt": "Test custom routing table",
            "task_type": "reasoning",
            "latency_priority": "balanced",
            "privacy_sensitivity": "public",
            "cost_envelope": "high_performance",
            "domain": "general"
        }
        response = client.post("/route", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["routed_model"] == "custom-reasoning-model"
        assert data["provider"] == "openai"
    finally:
        # Clean up
        if "ROUTING_TABLE_PATH" in os.environ:
            del os.environ["ROUTING_TABLE_PATH"]
        reload_routing_table()

def test_load_balancer_round_robin():
    """
    Test that the load balancer correctly performs round-robin across healthy instances based on weights.
    """
    from src.load_balancer import LoadBalancer, ProviderInstance
    
    # Initialize a clean load balancer with manual pools
    lb = LoadBalancer()
    pool = lb.get_pool("openai")
    assert pool is not None
    
    # Clear instances and add manual ones for deterministic round-robin testing
    pool.instances = [
        ProviderInstance(instance_id="openai-inst-1", api_key="key1", base_url="url1", weight=2),
        ProviderInstance(instance_id="openai-inst-2", api_key="key2", base_url="url2", weight=1)
    ]
    
    # Weighted selection order should be: inst-1, inst-1, inst-2, inst-1, inst-1, inst-2...
    insts = [lb.get_instance("openai").instance_id for _ in range(6)]
    assert insts == ["openai-inst-1", "openai-inst-1", "openai-inst-2", "openai-inst-1", "openai-inst-1", "openai-inst-2"]

def test_load_balancer_circuit_breaker():
    """
    Test that load balancer circuit breaker marks instances unhealthy after 3 consecutive failures
    and skips them, then restores them on success.
    """
    from src.load_balancer import LoadBalancer, ProviderInstance
    
    lb = LoadBalancer()
    pool = lb.get_pool("openai")
    assert pool is not None
    
    pool.instances = [
        ProviderInstance(instance_id="openai-inst-1", api_key="key1", base_url="url1", weight=1),
        ProviderInstance(instance_id="openai-inst-2", api_key="key2", base_url="url2", weight=1)
    ]
    
    # Check initial health
    assert pool.instances[0].healthy is True
    
    # Trigger 3 failures on instance 1
    lb.report_failure("openai", "openai-inst-1")
    lb.report_failure("openai", "openai-inst-1")
    lb.report_failure("openai", "openai-inst-1")
    
    # Inst 1 should now be unhealthy
    assert pool.instances[0].healthy is False
    
    # Active requests should only get Inst 2 now
    for _ in range(5):
        assert lb.get_instance("openai").instance_id == "openai-inst-2"
        
    # Trigger success on inst 1 to restore health
    lb.report_success("openai", "openai-inst-1")
    assert pool.instances[0].healthy is True
    assert pool.instances[0].total_failures == 0

def test_list_chains_endpoint():
    """
    Test the endpoint that list chain templates.
    """
    response = client.get("/route/chains")
    assert response.status_code == 200
    data = response.json()
    assert "retrieval_then_reasoning" in data
    assert "classify_then_generate" in data
    assert len(data["retrieval_then_reasoning"]["steps"]) == 2

def test_execute_chain_template():
    """
    Test execution of a pre-defined chain template.
    """
    payload = {
        "prompt": "Explain Quantum Computing in simple terms",
        "chain_name": "retrieval_then_reasoning",
        "user_id": "user_chain_test"
    }
    response = client.post("/route/chain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["chain_name"] == "retrieval_then_reasoning"
    assert data["steps_completed"] == 2
    assert "deep_reasoning" in [s["step_name"] for s in data["step_details"]]
    assert data["total_cost_usd"] > 0
    assert "Simulated response" in data["final_output"]

def test_execute_chain_custom():
    """
    Test execution of a custom chain request.
    """
    payload = {
        "prompt": "Compile draft article outline",
        "chain_name": "custom",
        "custom_steps": [
            {
                "step_name": "outline_generation",
                "model": "gpt-4o-mini",
                "provider": "openai",
                "prompt_template": "Generate an outline for: {input}",
                "temperature": 0.5
            },
            {
                "step_name": "outline_refinement",
                "model": "claude-3-5-haiku",
                "provider": "anthropic",
                "prompt_template": "Add details to this outline: {input}",
                "temperature": 0.7
            }
        ]
    }
    response = client.post("/route/chain", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["chain_name"] == "custom"
    assert data["steps_completed"] == 2
    assert data["step_details"][0]["step_name"] == "outline_generation"
    assert data["step_details"][1]["step_name"] == "outline_refinement"

def test_execute_chain_error():
    """
    Test chain error handling when custom steps are missing or steps fail.
    """
    # 1. Missing custom steps
    payload = {
        "prompt": "Test missing custom steps",
        "chain_name": "custom"
    }
    response = client.post("/route/chain", json=payload)
    assert response.status_code == 400
    
    # 2. Step failover simulation (invalid template name)
    payload = {
        "prompt": "Test invalid chain",
        "chain_name": "non_existent_template"
    }
    response = client.post("/route/chain", json=payload)
    assert response.status_code == 500

def test_admin_load_balancer_endpoint():
    """
    Test retrieval of load balancer stats.
    """
    response = client.get("/admin/load-balancer")
    assert response.status_code == 200
    data = response.json()
    assert "pools" in data
    pool_providers = [p["provider"] for p in data["pools"]]
    assert "openai" in pool_providers
    assert "google" in pool_providers


