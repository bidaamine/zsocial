import os
import json

base_dir = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial"
p_pkg = os.path.join(base_dir, "apps", "api", "package.json")
p_ts = os.path.join(base_dir, "apps", "api", "tsconfig.json")

# Fix Jest
with open(p_pkg, "r") as f:
    data = json.load(f)
if "jest" in data and "testRegex" in data["jest"]:
    data["jest"]["testRegex"] = ".*\\.spec\\.ts$"
    data["jest"]["transform"] = {
        "^.+\\.(t|j)s$": "ts-jest"
    }
with open(p_pkg, "w") as f:
    json.dump(data, f, indent=2)

# Fix TSConfig
with open(p_ts, "r") as f:
    data = json.load(f)
data["extends"] = "@nexus/tsconfig/base.json"
if "compilerOptions" not in data:
    data["compilerOptions"] = {}
data["compilerOptions"]["experimentalDecorators"] = True
data["compilerOptions"]["emitDecoratorMetadata"] = True
data["compilerOptions"]["esModuleInterop"] = True
if "exclude" not in data:
    data["exclude"] = ["node_modules", "dist"]
with open(p_ts, "w") as f:
    json.dump(data, f, indent=2)

print("Fixed API config")
