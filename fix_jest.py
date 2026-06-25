import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"
paths = [
    os.path.join(base_dir, "apps", "bff-gateway", "package.json"),
    os.path.join(base_dir, "apps", "realtime-gateway", "package.json"),
    os.path.join(base_dir, "services", "platform-services", "notification-service", "package.json"),
    os.path.join(base_dir, "services", "platform-services", "media-file-service", "package.json"),
    os.path.join(base_dir, "services", "platform-services", "audit-observability-service", "package.json")
]

for p in paths:
    if os.path.exists(p):
        with open(p, "r") as f:
            data = json.load(f)
        if "jest" in data and "testRegex" in data["jest"]:
            data["jest"]["testRegex"] = ".*\\.spec\\.ts$"
            data["jest"]["transform"] = {
                "^.+\\.(t|j)s$": "ts-jest"
            }
        with open(p, "w") as f:
            json.dump(data, f, indent=2)

print("Fixed package.jsons")
