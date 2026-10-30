---
reference:
  name: "Anthropic — frontend-design skill"
  url: "https://github.com/anthropics/skills"
  source_type: [ai_skill, visual_style]
  weight: craft
  website_context: { industry: "frontend", product_type: "agent skill", target_audience: "AI builders", device_priority: [desktop, mobile, responsive] }
  experience:
    site_archetype: "agent guidance"
    page_type: "skill document"
    user_goal: "make deliberate, specific visual decisions instead of templated defaults"
    primary_task: "plan → review against brief → build → critique"
  information_architecture:
    navigation_model: "skill document"
    content_hierarchy: [ground-in-subject, principles (type/motion/structure/copy), default-tell list, two-pass process, restraint]
  interaction:
    interaction_patterns: [design plan with tokens, self-critique before coding]
  visual_direction:
    design_philosophy: "craft / subject-driven identity"
    visual_style: "not a style: a method"
    density: "medium"
  rationale:
    what_works:
      - "Ground every choice in the subject's world (materials, vernacular, audience)."
      - "Name the current AI default clusters (cream+terracotta; black+acid green; broadsheet; SaaS card kit; template chrome) and avoid spending freedom on them."
      - "One memorable element; everything else quiet. Remove one accessory."
    risks: ["The tells list itself becomes a new template if followed literally."]
    when_to_use: ["writing the three directions and the visual brief"]
    when_not_to_use: ["as a substitute for the experience direction"]
  adaptation:
    suitable_for: ["marketing, product, portfolio, editorial"]
  agent_lessons:
    reusable_patterns: ["subject-first grounding", "two-pass plan/review", "one bold thing + restraint", "copy is design content"]
    creative_ideas: ["open with the most characteristic thing in the subject's world (not always a headline)"]
    questions_to_ask_user: ["what is the one memorable element of this page?"]
    forbidden_shortcuts: ["italic/bold one word as the only headline idea; numbered markers on non-sequences"]
---

# Takeaway

Method source: brainstorm a compact token plan, review it against the brief for defaults, revise, then build; write copy as design content (active voice, one job per element, errors that direct). It explicitly names the AI default clusters used in `STYLE-DIRECTIONS.md`.
