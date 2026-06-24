import os
import shutil
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"

apps_to_create = {
    "ar-vr-client": {
        "title": "AR/VR Client",
        "desc": "Spatial computing client for immersive learning worlds, virtual offices, holographic companions, corporate training, and medical/education experiences. Built for Unity/WebXR."
    },
    "developer-portal": {
        "title": "Developer Portal",
        "desc": "Developer portal and API ecosystem entrypoint for third-party integrations, marketplace agents, usage dashboards, and documentation."
    }
}

platform_services_to_create = {
    "health-service": "Owns health profiles, wearable integrations, symptom triage records, wellness plans, medication schedules, senior monitoring, and health permissions.",
    "education-service": "Owns learner profiles, curriculum sessions, tutor progress, assessments, cognitive fingerprinting, child learning progress, and adult upskilling paths.",
    "fitness-life-service": "Manages workouts, readiness, recovery, tasks, calendars, smart home actions, daily planning, schedule optimization, and life load balancing.",
    "personal-finance-service": "Manages budgets, goals, cash-flow predictions, shared family finances, subscriptions, savings recommendations, and financial scenario models.",
    "social-relationship-service": "Owns social graph, friends, communities, professional relationships, feeds, messaging metadata, relationship health, and social safety signals.",
    "child-safety-service": "Enforces dynamic age-gating, child-safe content routing, behavioural safety signals, cyberbullying/grooming risk patterns, and parent alerts.",
    "branding-marketing-service": "Manages brand identity assets, campaign briefs, content calendars, audience segments, campaign performance, brand consistency, and competitive intelligence feeds.",
    "hr-talent-service": "Manages hiring pipelines, candidate profiles, explainable screening records, employee development plans, performance signals, flight risk data, and wellbeing indicators.",
    "business-growth-service": "Owns corporate financial forecasts, business health score inputs, lead/prospect data, partnership/investor matching records, and scenario planning.",
    "operations-command-service": "Owns operational health dashboards, project health, workforce productivity analytics, team communication intelligence, automated reports, and cognitive load signals.",
    "security-agent": "Dedicated trust and security runtime layer for zero-trust request inspection, threat detection, device/session trust, suspicious login detection, child-safety enforcement, health-data access protection.",
    "privacy-engine": "Consent enforcement, anonymization, differential privacy, data minimization, child-data handling, and privacy checks before analytics or AI training use."
}

def create_readme(path, title, description):
    content = f"# {title}\n\n## Description\n{description}\n\n## Role in NEXUS AI Ecosystem\nThis component is a critical part of the NEXUS AI platform, operating within its defined architectural layer to deliver the next-generation AI-powered social ecosystem.\n"
    with open(os.path.join(path, "README.md"), "w", encoding="utf-8") as f:
        f.write(content)

# 1. Create Apps
apps_dir = os.path.join(base_dir, "apps")
for app, data in apps_to_create.items():
    app_path = os.path.join(apps_dir, app)
    os.makedirs(app_path, exist_ok=True)
    create_readme(app_path, data["title"], data["desc"])
    print(f"Created app: {app}")

# 2. Create Platform Services
plat_dir = os.path.join(base_dir, "services", "platform-services")
for service, desc in platform_services_to_create.items():
    svc_path = os.path.join(plat_dir, service)
    os.makedirs(svc_path, exist_ok=True)
    title = service.replace('-', ' ').title()
    create_readme(svc_path, title, desc)
    print(f"Created platform service: {service}")

# 3. Clean up AI Services
ai_dir = os.path.join(base_dir, "services", "ai-services")
# Merge finance
finance_growth = os.path.join(ai_dir, "ai-finance-growth")
finance_personal = os.path.join(ai_dir, "ai-finance-personal")
finance_combined = os.path.join(ai_dir, "ai-finance-business-growth")
os.makedirs(finance_combined, exist_ok=True)
create_readme(finance_combined, "Finance & Business Growth AI Engine", "Python AI service for personal financial modelling, cash-flow warnings, savings recommendations, business forecasts, scenarios, and plain-language explanations.")

if os.path.exists(finance_growth): shutil.rmtree(finance_growth)
if os.path.exists(finance_personal): shutil.rmtree(finance_personal)

# Remove extra services not in 15 modules
extra_services = ["ai-safety-evaluation", "ai-social-community"]
for es in extra_services:
    es_path = os.path.join(ai_dir, es)
    if os.path.exists(es_path):
        shutil.rmtree(es_path)
        print(f"Removed extra AI service: {es}")

print("Filesystem updates complete.")
