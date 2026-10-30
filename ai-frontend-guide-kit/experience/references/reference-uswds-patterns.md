---
reference:
  name: "USWDS — Design Patterns (complex forms, in-page nav)"
  url: "https://designsystem.digital.gov/patterns/"
  source_type: [design_system, ux_pattern, accessibility]
  weight: evidence
  website_context: { industry: "public sector", product_type: "design system", target_audience: "citizens + agencies", device_priority: [mobile, desktop, responsive] }
  experience:
    site_archetype: "destination/application"
    page_type: "services, forms, reference pages"
    user_goal: "complete complex services with low stress"
    primary_task: "long/complex forms, long-document navigation"
    emotional_intent: "calm progress"
  information_architecture:
    navigation_model: "hub + in-page"
    section_order: [overview, step, review, confirm]
  interaction:
    interaction_patterns: [complete a complex form, progress easily, save and continue, in-page navigation, identifying users, error handling]
    progressive_disclosure: true
    error_strategy: "summary + per-field, plain language"
  visual_direction:
    design_philosophy: "functional clarity"
    visual_style: "swiss"
    density: "medium"
    motion_role: "none"
  rationale:
    what_works:
      - "Order questions simple → difficult; show progress and let users save and continue."
      - "In-page navigation keeps long reference pages scannable."
      - "Accessibility organized as perceivable, operable, understandable, robust from the start."
    risks: ["Utility aesthetic; low brand expression."]
    when_to_use: ["complex forms, long documents, documentation sites"]
    when_not_to_use: ["campaigns"]
  adaptation:
    suitable_for: ["government, healthcare, finance, enterprise onboarding"]
    documentation_variant: "in-page nav + sidebar + search"
    saas_variant: "progressive onboarding with checklist"
  agent_lessons:
    reusable_patterns: ["simple-to-hard question order", "save and continue", "progress indicator", "in-page navigation", "identify users only when needed"]
    creative_ideas: ["turn a long page into sections with an in-page map"]
    questions_to_ask_user: ["can this form be resumed on another device?"]
    forbidden_shortcuts: ["all questions at once"]
---

# Takeaway

Use for long processes and long pages: split, order by difficulty, show progress, allow save/resume, and add in-page navigation. Complements GOV.UK with the accessibility structure (POUR) and the "identify users only when needed" rule.
