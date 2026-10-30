---
reference:
  name: "Scrollytelling & horizontal scroll — Webflow guide / Really Good Designs"
  url: "https://webflow.com/blog/scrollytelling-guide · https://reallygooddesigns.com/horizontal-scroll-websites/"
  source_type: [visual_style, case_study]
  weight: inspiration
  website_context: { industry: "editorial/brand", product_type: "techniques", target_audience: "designers", device_priority: [desktop, mobile] }
  experience:
    site_archetype: "narrative/experiential"
    page_type: "story pages"
    user_goal: "experience a narrative while scrolling"
    primary_task: "reveal content in paced steps"
  information_architecture:
    navigation_model: "single-page anchors"
    section_order: [hook, chapters, proof, close]
  interaction:
    interaction_patterns: [position:sticky scenes, scroll-driven reveals, parallax, horizontal scroll galleries, scroll progress]
    progressive_disclosure: true
    loading_states: "media-heavy: preload and placeholders"
  visual_direction:
    design_philosophy: "narrative and emotion"
    visual_style: "editorial/cinematic"
    density: "low"
    motion_role: "explains transitions and pacing"
  rationale:
    what_works:
      - "Sticky scenes turn long content into a sequence of moments."
      - "Horizontal scroll creates a gallery/route feeling for non-linear content."
    risks:
      - "Motion sickness, reduced-motion, mobile performance, hidden content for SEO, hijacked scroll frustration."
    when_to_use: ["launches, product stories, portfolios, campaigns"]
    when_not_to_use: ["dashboards, docs, checkout, repeated tasks"]
  adaptation:
    suitable_for: ["narrative pages with a clear chapter structure"]
    saas_variant: "product walkthrough with sticky steps + demo"
    industrial_variant: "process explanation step by step"
  agent_lessons:
    reusable_patterns: ["sticky scene", "scroll progress", "chaptered narrative", "reduced-motion alternative"]
    creative_ideas: ["map the journey phases to scroll chapters; place the peak at 2/3"]
    questions_to_ask_user: ["is the story strong enough to justify the motion cost?"]
    forbidden_shortcuts: ["scroll-jacking without an escape; motion on everything"]
---

# Takeaway

Use only for storyteller/narrative archetypes, always with a reduced-motion path, preloaded media and a non-animated fallback. The map template for these pages is `one-page` (sections + anchors), not a screen grid.
