import json

with open("apps/api/package.json", "r") as f:
    data = json.load(f)

data["scripts"]["test"] = "jest"
data["jest"] = {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
        "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
}

with open("apps/api/package.json", "w") as f:
    json.dump(data, f, indent=2)

print("Added test script and jest config to apps/api")
