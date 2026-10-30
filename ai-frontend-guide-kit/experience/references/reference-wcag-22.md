---
reference:
  name: "WCAG 2.2 Quick Reference"
  url: "https://www.w3.org/WAI/WCAG22/quickref/"
  source_type: [accessibility_standard]
  weight: evidence
  website_context: { industry: "cross-industry", product_type: "accessibility standard", target_audience: "designers and developers", device_priority: [desktop, mobile, responsive] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "accessibility standard"
    user_goal: "meet an accessibility conformance level"
    primary_task: "filter success criteria by level and technology"
    emotional_intent: "precision"
  information_architecture:
    navigation_model: "principles POUR > guidelines > criteria"
    content_hierarchy: "criterion > how to meet > techniques"
  interaction:
    interaction_patterns: [filters, links]
  visual_direction:
    design_philosophy: "functional clarity"
    visual_style: "minimal"
    density: "medium"
  rationale:
    what_works:
      - "2.5.8 Target Size (Minimum, AA): pointer targets at least 24x24 CSS px; aim for 44x44 where possible."
      - "2.4.11 Focus Not Obscured (AA): sticky headers and cookie bars must not hide the focused element; 2.4.13 Focus Appearance (AAA) asks for a visible 2px, 3:1 indicator."
      - "2.5.7 Dragging Movements (AA): every drag needs a single-pointer alternative (buttons, tap to move)."
      - "3.3.8 Accessible Authentication (AA): no memory, puzzle or transcription test to log in; allow paste and password managers."
      - "3.2.6 Consistent Help and 3.3.7 Redundant Entry (A): keep help in the same place and never ask for the same data twice in a flow."
    risks: ["Treating automated checks as full conformance", "Focus styles removed by a CSS reset"]
    when_to_use: ["every project; set the target in q35-wcag"]
    when_not_to_use: ["as a substitute for testing with assistive technology"]
  adaptation:
    suitable_for: ["all products", "public sector and e-commerce with legal exposure"]
  agent_lessons:
    reusable_patterns: ["visible focus ring", "24px minimum targets", "single-pointer alternative to drag", "paste-friendly login"]
    creative_ideas: ["turn the criteria into a Playwright + axe check in phase 3"]
    questions_to_ask_user: ["which conformance level is required, and is there legal exposure (EAA, ADA, Section 508)?"]
    forbidden_shortcuts: ["outline: none without a replacement", "icon-only buttons without accessible names"]
---

# Takeaway

Record the WCAG target in the brief (default AA) and carry the five new 2.2 criteria into component adaptation and the phase-3 audit.
