import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"
paths = [
    os.path.join(base_dir, "apps", "bff-gateway", "tsconfig.json"),
    os.path.join(base_dir, "apps", "realtime-gateway", "tsconfig.json"),
    os.path.join(base_dir, "services", "platform-services", "notification-service", "tsconfig.json"),
    os.path.join(base_dir, "services", "platform-services", "media-file-service", "tsconfig.json"),
    os.path.join(base_dir, "services", "platform-services", "audit-observability-service", "tsconfig.json")
]

for p in paths:
    if os.path.exists(p):
        with open(p, "r") as f:
            data = json.load(f)
        
        data["extends"] = "@nexus/tsconfig/base.json"
        
        if "compilerOptions" not in data:
            data["compilerOptions"] = {}
            
        data["compilerOptions"]["experimentalDecorators"] = True
        data["compilerOptions"]["emitDecoratorMetadata"] = True
        data["compilerOptions"]["esModuleInterop"] = True
        
        if "exclude" not in data:
            data["exclude"] = ["node_modules", "dist"]
            
        with open(p, "w") as f:
            json.dump(data, f, indent=2)

print("Fixed tsconfig.json files")
