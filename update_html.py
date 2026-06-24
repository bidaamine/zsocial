import re

file_path = r"f:\Users\BIDA Mohamed Amine\Documents\Projects\DigiBooking\zsocial\nexus-system-topology-with-security.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Family Hub
content = content.replace('"nexus_family_harmony_ai_service"', '"nexus_family_hub_child_safety_ai_service"')
content = content.replace('"Family Harmony AI"', '"Family Hub + Child Safety AI"')

# 2. Update Finance + Business Growth
content = content.replace('"nexus_finance_ai_service"', '"nexus_finance_business_growth_ai_service"')
content = content.replace('"Finance AI"', '"Finance + Business Growth AI Engine"')

# 3. Remove Immersive Reality AI service from nodes data
# We can find the dict object for nexus_immersive_ai_service and remove it
pattern = r'\{\s*"id":\s*"nexus_immersive_ai_service"[\s\S]*?\},'
content = re.sub(pattern, '', content)

# Remove any links involving nexus_immersive_ai_service
pattern_link = r'\{\s*"source":\s*"nexus_immersive_ai_service"[\s\S]*?\},|\{\s*"target":\s*"nexus_immersive_ai_service"[\s\S]*?\},'
content = re.sub(pattern_link, '', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("HTML topology updated successfully.")
