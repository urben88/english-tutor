---
reference:
  name: "NN/g — Journey Mapping 101"
  url: "https://www.nngroup.com/articles/journey-mapping-101/"
  source_type: [ux_pattern, case_study]
  weight: evidence
  website_context: { industry: "cross-industry", product_type: "method", target_audience: "product teams", device_priority: [desktop] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "article"
    user_goal: "understand and produce a journey map"
    primary_task: "map actor, scenario and phases"
    emotional_intent: "clarity"
  information_architecture:
    navigation_model: "hub"
    section_order: [definition, when-to-use, elements, process, pitfalls]
  interaction:
    interaction_patterns: [templates, examples]
  visual_direction:
    design_philosophy: "functional clarity"
    density: "medium"
  rationale:
    what_works:
      - "Journey maps coordinate a team around the user's experience, not features."
      - "Phases with actions, thoughts and emotions expose friction and opportunities."
      - "Scope to one actor and one scenario per map."
    risks: ["Decorative maps with no opportunities or decisions attached."]
    when_to_use: ["before flows and IA", "to choose between directions"]
    when_not_to_use: ["as a deliverable with no design consequence"]
  adaptation:
    suitable_for: ["services, apps, commerce, internal tools"]
  agent_lessons:
    reusable_patterns: ["actor + scenario + phases", "actions/thoughts/emotions per phase", "friction → opportunity table"]
    creative_ideas: ["design the emotional peak and the ending (peak-end)"]
    questions_to_ask_user: ["what happens before and after the page?"]
    forbidden_shortcuts: ["happy-path-only journeys"]
---

# Takeaway

The brief's journey section uses this structure: actor, scenario, phases, actions, thoughts, emotions, friction, opportunity, next step. It feeds both the flows (`02-UX-FLOWS`) and the map rows. Include what happens before and after the product, not only inside it.
