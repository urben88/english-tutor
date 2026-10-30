---
reference:
  name: "Core Web Vitals"
  url: "https://web.dev/articles/vitals"
  source_type: [performance_standard]
  weight: evidence
  website_context: { industry: "cross-industry", product_type: "performance guidance", target_audience: "designers and developers", device_priority: [desktop, mobile, responsive] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "performance guidance"
    user_goal: "keep pages fast and stable on real devices"
    primary_task: "measure and fix LCP, INP and CLS"
    emotional_intent: "precision"
  information_architecture:
    navigation_model: "metric > thresholds > optimization guides"
    content_hierarchy: "metric > cause > fix"
  interaction:
    interaction_patterns: [links]
  visual_direction:
    design_philosophy: "functional clarity"
    visual_style: "minimal"
    density: "medium"
  rationale:
    what_works:
      - "Good thresholds at the 75th percentile: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1."
      - "Heavy hero effects (WebGL, video, large shaders) are the usual LCP/INP cost; they are why the effect budget is 1-2 per view."
      - "Reserve space for images, embeds and late fonts to avoid layout shift; animate transform and opacity only."
    risks: ["Lab scores differ from field data"]
    when_to_use: ["define a performance budget in phase 1 and verify in phase 3"]
    when_not_to_use: ["none"]
  adaptation:
    suitable_for: ["all public sites", "effect-heavy marketing pages"]
  agent_lessons:
    reusable_patterns: ["image dimensions set", "preload hero asset", "code-split effects", "avoid long main-thread tasks"]
    creative_ideas: ["add Lighthouse to the Playwright loop and fail on a regression"]
    questions_to_ask_user: ["what devices and networks must be fast (q31, q33)?"]
    forbidden_shortcuts: ["autoplaying heavy backgrounds on mobile", "unsized images"]
---

# Takeaway

Pair every expressive component from `backgrounds-effects` with a measured budget; reject it if INP or LCP leaves the good range.
