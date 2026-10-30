---
reference:
  name: "Laws of UX"
  url: "https://lawsofux.com/"
  source_type: [ux_pattern]
  weight: evidence
  website_context: { industry: "cross-industry", product_type: "principles catalogue", target_audience: "designers", device_priority: [desktop, responsive] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "principle cards"
    user_goal: "justify decisions with established principles"
    primary_task: "browse principles and apply them"
    emotional_intent: "precision"
  information_architecture:
    navigation_model: "hub of principles"
    content_hierarchy: "principle → definition → examples → takeaways"
  interaction:
    interaction_patterns: [cards, search, links]
  visual_direction:
    design_philosophy: "functional clarity"
    visual_style: "minimal"
    density: "medium"
  rationale:
    what_works:
      - "Jakob's Law: users transfer expectations from sites they know — be original, not confusing."
      - "Hick's Law: more options = slower decisions — reduce or group choices."
      - "Fitts's Law: size/position of targets matter — primary actions big and close."
      - "Aesthetic-usability, peak-end, serial position, choice overload inform first/last impressions and lists."
    risks: ["Using laws as absolute formulas instead of heuristics."]
    when_to_use: ["justifying layout, navigation and option-count decisions"]
    when_not_to_use: ["replacing user testing"]
  adaptation:
    suitable_for: ["all products"]
  agent_lessons:
    reusable_patterns: ["reduce/group choices", "anchor expectations with familiar patterns", "optimize primary target size/position", "design the peak and the end"]
    creative_ideas: ["use serial position to place the strongest proof first/last in lists"]
    questions_to_ask_user: ["what will users expect from sites they already use?"]
    forbidden_shortcuts: ["novel navigation with familiar labels missing"]
---

# Takeaway

The brief must name the principle behind structural choices (Jakob, Hick, Fitts, Miller, peak-end). If a decision cannot cite a principle or a user need, it is decoration.
