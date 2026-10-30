---
reference:
  name: "anti-ai-slop — P0–P6 taxonomy"
  url: "https://github.com/muris11/anti-ai-slop"
  source_type: [ai_skill, ux_pattern]
  weight: craft
  website_context: { industry: "frontend", product_type: "agent skill", target_audience: "AI builders", device_priority: [desktop, mobile] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "rules + audit protocol"
    user_goal: "stop generic AI output without imposing one aesthetic"
    primary_task: "audit and fix AI tells"
  information_architecture:
    navigation_model: "skill documents"
    content_hierarchy: "always-on filter + severity tiers P0–P6 + audit protocol (quick/full/deep)"
  interaction:
    interaction_patterns: [purpose test, convergence test, delivery gate]
  visual_direction:
    design_philosophy: "craft / anti-generic"
    density: "medium"
  rationale:
    what_works:
      - "Slop is the unmarked default, not any single technique."
      - "Purpose test: one honest sentence per technique. Convergence test: same trick everywhere = tell."
      - "Severity tiers let the agent scan at the depth needed."
    risks: ["Over-filtering to sterile results; direction still required."]
    when_to_use: ["before proposing directions and after composing screens"]
    when_not_to_use: ["as a style guide"]
  adaptation:
    suitable_for: ["any AI-generated interface"]
  agent_lessons:
    reusable_patterns: ["purpose test", "convergence test", "P0/P1 tells list", "audit quick/full/deep"]
    creative_ideas: ["delivery gate: no screen closes without the purpose test"]
    questions_to_ask_user: ["can we justify this technique for this product in one sentence?"]
    forbidden_shortcuts: ["gradient + three cards without a reason"]
---

# Takeaway

Source of the anti-generic list and tests in `STYLE-DIRECTIONS.md`. Apply tiers: P0 instant tell, P1 strong tell, P2 suspicious default, P3 context-dependent, P4 incomplete states (quality), P5 fake content (authenticity), P6 code slop.
