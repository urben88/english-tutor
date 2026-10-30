---
reference:
  name: "Mobile and touch guidelines (HIG, Material, WCAG 2.5.8)"
  url: "https://developer.apple.com/design/human-interface-guidelines/"
  source_type: [platform_guideline]
  weight: evidence
  website_context: { industry: "cross-industry", product_type: "platform guidance", target_audience: "designers and developers", device_priority: [desktop, mobile, responsive] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "platform guidance"
    user_goal: "make interfaces comfortable on touch screens"
    primary_task: "set target sizes, spacing and gesture rules"
    emotional_intent: "comfort"
  information_architecture:
    navigation_model: "foundations > patterns"
    content_hierarchy: "guideline > rationale"
  interaction:
    interaction_patterns: [links]
  visual_direction:
    design_philosophy: "functional clarity"
    visual_style: "minimal"
    density: "medium"
  rationale:
    what_works:
      - "Minimum targets: Apple 44x44 pt, Material 48x48 dp, WCAG 2.5.8 AA 24x24 CSS px (use 44 where you can)."
      - "Primary actions in the thumb zone (bottom on large phones); destructive actions away from frequent taps."
      - "Gestures need visible alternatives; hover-only information must exist on touch."
      - "Respect safe areas, dynamic type and prefers-reduced-motion; forms use the right input types and keyboards."
    risks: ["Desktop layouts squeezed into mobile"]
    when_to_use: ["any project with q31 = mobile or both"]
    when_not_to_use: ["kiosk or desktop-only tools"]
  adaptation:
    suitable_for: ["mobile web", "PWAs", "responsive apps"]
  agent_lessons:
    reusable_patterns: ["bottom navigation or sheet", "44 px targets", "inputmode and autocomplete attributes", "sticky primary CTA"]
    creative_ideas: ["design the mobile map first in ux-map for mobile-priority products"]
    questions_to_ask_user: ["one-handed use? gloves or outdoor light (q34)?"]
    forbidden_shortcuts: ["hover-only menus", "tiny close buttons"]
---

# Takeaway

Put target size, thumb reach and gesture alternatives into UX-SPEC for every mobile-priority screen.
