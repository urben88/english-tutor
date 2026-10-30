---
reference:
  name: "Deceptive Patterns (dark patterns)"
  url: "https://www.deceptive.design/"
  source_type: [ux_pattern]
  weight: evidence
  website_context: { industry: "cross-industry", product_type: "anti-pattern catalogue", target_audience: "designers and developers", device_priority: [desktop, mobile, responsive] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "anti-pattern catalogue"
    user_goal: "avoid manipulative design that harms users and exposes the business"
    primary_task: "check flows against known deceptive types"
    emotional_intent: "trust"
  information_architecture:
    navigation_model: "catalogue of types with examples"
    content_hierarchy: "type > description > real cases"
  interaction:
    interaction_patterns: [cards, links]
  visual_direction:
    design_philosophy: "transparency"
    visual_style: "minimal"
    density: "medium"
  rationale:
    what_works:
      - "Name the types so they can be audited: roach motel (easy in, hard to cancel), forced continuity, confirmshaming, hidden costs, trick questions, misdirection (prominent Accept, buried Reject), comparison prevention, addictive design."
      - "Symmetry rule: cancelling, rejecting and declining must take about the same effort as accepting."
      - "Price honesty: show total cost early; no surprise fees at the last checkout step."
    risks: ["Agents optimizing for conversion drift into these patterns by default"]
    when_to_use: ["checkout, pricing, consent, subscriptions, onboarding, notifications"]
    when_not_to_use: ["none: always audit"]
  adaptation:
    suitable_for: ["commerce", "subscriptions", "consent flows", "growth experiments"]
  agent_lessons:
    reusable_patterns: ["equal-weight accept/reject", "cancel in as many steps as signup", "total price up front", "neutral button copy"]
    creative_ideas: ["add a 'could this be called deceptive?' line to each flow in UX-SPEC"]
    questions_to_ask_user: ["is there a subscription, trial, consent banner or upsell in the flow?"]
    forbidden_shortcuts: ["countdown timers or scarcity claims that are not real", "pre-checked paid add-ons", "confirmshaming copy"]
---

# Takeaway

Run every conversion flow through this list in phase 3. Tension between 'conversion without friction' and honesty is resolved in favour of honesty.
