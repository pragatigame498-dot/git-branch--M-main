import re
from typing import Dict, Optional
import database

# ==============================================================================
# AI PERSISTENT MEMORY EXTRACTOR & MANAGER
# Automatically extracts personal information explicitly shared by the user
# and stores them in SQLite DB to remember across conversations like ChatGPT.
# ==============================================================================

PATTERNS = [
    # Name
    (r"(?:my name is|your name is|i am|you are|call me|call yourself|majhe nav|majh nav|tujhe nav|tuze nav|tumche nav|name is)\s+([a-zA-Z\s\.]{1,30})", "Name"),
    # City / Location
    (r"(?:i live in|i am from|my city is|location is|mi\s+([A-Za-z]+)\s+madhye|living in)\s+([a-zA-Z\s]{2,25})", "City"),
    # College / Education
    (r"(?:my college is|i study at|student at|degree in|studying in)\s+([A-Za-z0-9\s\.]{3,40})", "College"),
    # Profession / Role
    (r"(?:i work as a|i am a|my profession is|my role is|intern at)\s+([A-Za-z0-9\s\.]{3,40})", "Profession"),
    # Skills
    (r"(?:my skills are|i know|proficient in|skilled in)\s+([A-Za-z0-9\s\,\.\#\+]{3,50})", "Skills"),
    # Projects
    (r"(?:my project is|working on project|built project|project name is)\s+([A-Za-z0-9\s\.\-]{3,40})", "Projects"),
    # Goal / Interest
    (r"(?:my goal is|i want to become|passionate about)\s+([A-Za-z0-9\s\.]{3,40})", "Goals"),
]

def extract_and_save_memories(text: str, user_id: str = "default_user") -> Dict[str, str]:
    """
    Extracts personal facts from user message and persists them in SQLite database.
    """
    extracted = {}
    text_lower = text.lower().strip()
    
    # Direct regex pattern matching for fast extraction
    for pattern, category in PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            groups = match.groups()
            fact_value = groups[-1].strip() if groups else ""
            if fact_value and len(fact_value) > 1:
                # Capitalize names cleanly
                if category == "Name":
                    fact_value = fact_value.title()
                fact_value = fact_value.rstrip(".,!")
                database.save_user_memory(category, fact_value, user_id)
                extracted[category] = fact_value

    # Direct conversational fallback heuristics for name
    name_phrases = ["your name is", "my name is", "call me", "call yourself", "name is", "tujhe nav", "tuze nav", "majhe nav", "majh nav"]
    for phrase in name_phrases:
        if phrase in text_lower and "Name" not in extracted:
            name_val = text_lower.split(phrase)[-1].strip().title()
            name_val = re.sub(r"[.,!?].*", "", name_val).strip()
            if name_val and len(name_val) >= 2:
                database.save_user_memory("Name", name_val, user_id)
                extracted["Name"] = name_val
                break

    if "i live in" in text_lower and "City" not in extracted:
        city_val = text_lower.split("i live in")[-1].strip().title()
        city_val = re.sub(r"[.,!?].*", "", city_val).strip()
        if city_val:
            database.save_user_memory("City", city_val, user_id)
            extracted["City"] = city_val

    return extracted

def get_memory_context(user_id: str = "default_user") -> str:
    """
    Returns formatted memory string to be injected into LLM system prompt.
    """
    memories = database.get_all_user_memories(user_id)
    if not memories:
        return ""

    lines = ["========================", "USER & AI MEMORY (SAVED FACTS)", "========================"]
    for category, fact in memories.items():
        lines.append(f"- {category}: {fact}")
    return "\n".join(lines) + "\n\n"
