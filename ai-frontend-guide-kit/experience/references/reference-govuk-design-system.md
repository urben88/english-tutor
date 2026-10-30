---
reference:
  name: "GOV.UK Design System"
  url: "https://design-system.service.gov.uk/"
  source_type: [design_system, ux_pattern, accessibility]
  weight: evidence
  website_context: { industry: "government", product_type: "service design system", target_audience: "citizens + public servants", device_priority: [mobile, desktop, responsive] }
  experience:
    site_archetype: "destination/application + knowledge"
    page_type: "patterns, components, service flows"
    user_goal: "complete a government task without confusion"
    primary_task: "forms, step-by-step journeys, confirmation"
    emotional_intent: "confidence, no anxiety"
    trust_strategy: "plain language, one question per page, visible progress"
  information_architecture:
    navigation_model: "hub + in-page"
    section_order: [start, each step, check answers, confirmation]
  interaction:
    main_flow: ["start page", "one question per page", "check your answers", "confirmation"]
    interaction_patterns: [step-by-step navigation, question pages, task list, error summary, confirmation]
    progressive_disclosure: true
    feedback_strategy: "inline errors + error summary linked to fields"
    empty_states: "explicit"
  visual_direction:
    design_philosophy: "functional clarity / transparency"
    visual_style: "swiss, typographic, no decoration"
    density: "medium"
    motion_role: "none"
  rationale:
    what_works:
      - "Only ask what is needed; one question per page reduces cognitive load."
      - "Step-by-step navigation shows where you are and what is next."
      - "Check-your-answers before committing prevents expensive errors."
    risks: ["Bare styling feels governmental; inappropriate for expressive brands."]
    when_to_use: ["wizards, forms, onboarding, multi-step processes"]
    when_not_to_use: ["brand/marketing moments, exploratory content"]
  adaptation:
    suitable_for: ["configurators, checkout, onboarding, internal processes"]
    saas_variant: "wizard with progress + save and resume"
    industrial_variant: "checklist with confirmations and audit trail"
  agent_lessons:
    reusable_patterns: ["one question per page", "progress visible", "review before submit", "error summary linked", "plain language"]
    creative_ideas: ["a task list screen turns a long process into a navigable launcher"]
    questions_to_ask_user: ["can the user save and resume?"]
    forbidden_shortcuts: ["asking for data you already have"]
---

# Takeaway

The reference for any multi-step flow: minimal questions, one decision per screen, visible progress, review step and accessible errors. Directly informs `flow-forms`, `flow-onboarding` and `flow-checkout`, plus the `flow` map template (steps + decisions).
