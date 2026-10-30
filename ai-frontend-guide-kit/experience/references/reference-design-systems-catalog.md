---
reference:
  name: "Public design systems (Material 3, Carbon, Atlassian, Polaris, Apple HIG, Fluent 2)"
  url: "https://m3.material.io/"
  source_type: [design_system]
  weight: product
  website_context: { industry: "cross-industry", product_type: "design system catalogue", target_audience: "designers and developers", device_priority: [desktop, mobile, responsive] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "design system catalogue"
    user_goal: "borrow tokens, states and component behavior from mature systems"
    primary_task: "study component anatomy, states and guidelines"
    emotional_intent: "confidence"
  information_architecture:
    navigation_model: "foundations > components > patterns"
    content_hierarchy: "principle > component > usage"
  interaction:
    interaction_patterns: [links, cards]
  visual_direction:
    design_philosophy: "functional clarity"
    visual_style: "minimal"
    density: "medium"
  rationale:
    what_works:
      - "Material 3 (m3.material.io): dynamic colour roles, type scale, motion tokens; mobile and Android reference."
      - "Carbon (carbondesignsystem.com): enterprise data-heavy UI, dense tables, strong accessibility."
      - "Atlassian (atlassian.design) and Polaris (polaris.shopify.com): task-oriented product UI, content guidelines, empty states."
      - "Apple HIG (developer.apple.com/design/human-interface-guidelines): platform conventions, 44 pt targets, motion and materials."
      - "Fluent 2 (fluent2.microsoft.design): cross-platform productivity UI."
    risks: ["Looking like the system you copied", "Mixing tokens from several systems"]
    when_to_use: ["when a product has no design system yet or needs states and behavior defined"]
    when_not_to_use: ["as a visual identity source"]
  adaptation:
    suitable_for: ["dashboards", "enterprise apps", "mobile apps"]
  agent_lessons:
    reusable_patterns: ["token roles (surface, on-surface, outline)", "documented states per component", "content guidelines for labels and errors"]
    creative_ideas: ["extract only the token structure into DESIGN.md, then restyle"]
    questions_to_ask_user: ["is there a platform whose conventions users already know (iOS, Android, Microsoft)?"]
    forbidden_shortcuts: ["copying a system's brand colours and logos", "shipping its proprietary icons or fonts without a license"]
---

# Takeaway

Use these systems as behavior and token references (Jakob's law), not as a look. Cite the system in the brief when a pattern comes from it.
