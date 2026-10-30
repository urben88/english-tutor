---
reference:
  name: "NN/g — 10 Usability Heuristics"
  url: "https://www.nngroup.com/articles/ten-usability-heuristics/"
  source_type: [ux_pattern, accessibility]
  weight: evidence
  website_context: { industry: "cross-industry", product_type: "guidelines", target_audience: "designers/PMs", device_priority: [desktop, mobile, responsive] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "article"
    user_goal: "check a design against proven usability criteria"
    business_goal: "establish authority"
    primary_task: "evaluate interface decisions"
    emotional_intent: "confidence"
    trust_strategy: "research-backed rules with examples"
  information_architecture:
    navigation_model: "hub"
    content_hierarchy: "10 numbered heuristics, each with definition, examples, takeaways"
    section_order: [visibility-of-status, match-real-world, user-control, consistency, error-prevention, recognition-over-recall, flexibility, aesthetic-minimalism, error-recovery, help-docs]
  interaction:
    interaction_patterns: [checklist, examples, cross-links]
  visual_direction:
    design_philosophy: "functional clarity"
    visual_style: "editorial minimal"
    density: "medium"
  rationale:
    what_works:
      - "Status visibility and feedback are treated as first-class, not decoration."
      - "Recognition over recall: do not make users remember context across steps."
      - "Error prevention beats good error messages."
    risks: ["Generic checklist reading without applying it to the specific product."]
    when_to_use: ["auditing a proposal or a screen", "justifying a decision in the brief"]
    when_not_to_use: ["as a substitute for user testing"]
  adaptation:
    suitable_for: ["all products"]
  agent_lessons:
    reusable_patterns: ["visible system status", "match user language", "user control and undo", "consistency", "error prevention", "recognition over recall", "expert flexibility", "aesthetic minimalism", "help users recover", "help and documentation"]
    creative_ideas: ["use heuristics as the audit checklist, not as the design idea"]
    questions_to_ask_user: ["what happens when the user gets it wrong?"]
    forbidden_shortcuts: ["decorative feedback without meaning"]
---

# Takeaway

Use the 10 heuristics as the pass/fail audit for every direction and screen: status, real-world language, control/undo, consistency, prevention, recognition, flexibility, minimalism, recovery, help. They justify why a structure is chosen and catch the anti-patterns LLMs repeat (hidden state, memory load, irreversible actions).
