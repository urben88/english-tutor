---
reference:
  name: "The Shape of AI"
  url: "https://www.shapeof.ai/"
  source_type: [ux_pattern]
  weight: product
  website_context: { industry: "cross-industry", product_type: "AI pattern library", target_audience: "designers and developers", device_priority: [desktop, mobile, responsive] }
  experience:
    site_archetype: "knowledge/reference"
    page_type: "AI pattern library"
    user_goal: "design AI features with proven interaction patterns"
    primary_task: "browse patterns by lifecycle stage"
    emotional_intent: "trust"
  information_architecture:
    navigation_model: "patterns grouped by lifecycle"
    content_hierarchy: "stage > pattern > examples"
  interaction:
    interaction_patterns: [cards, filters]
  visual_direction:
    design_philosophy: "transparency"
    visual_style: "minimal"
    density: "medium"
  rationale:
    what_works:
      - "Lifecycle structure: getting started (onboarding, sample prompts), prompting (contextual input, clarifying questions), output handling (regenerate, summarize, edit), trust (transparency, human-in-the-loop)."
      - "Streaming output shows progress while the model works; phase or step labels beat a bare spinner for long agent runs."
      - "Citations and sources answer 'should I believe this?'; provide click-through and visible uncertainty."
      - "Human control: edit, undo, confirm and stop are part of the surface, not extras; show what the AI did and let the user reverse it."
    risks: ["Copying chat UI when the task is better served by a form or button", "Hiding that content is AI-generated"]
    when_to_use: ["any product with a conversational, generative or agentic feature"]
    when_not_to_use: ["products with no AI feature"]
  adaptation:
    suitable_for: ["ai-assistant", "copilot", "agent consoles", "search with generated answers"]
  agent_lessons:
    reusable_patterns: ["streaming with phase labels", "sources/citations", "regenerate/edit/undo", "confirm before irreversible tool actions", "sample prompts and clarifying questions"]
    creative_ideas: ["show reasoning steps as a collapsible timeline instead of raw logs"]
    questions_to_ask_user: ["what can the AI do on the user's behalf, and what needs confirmation?", "how will the user verify an answer?"]
    forbidden_shortcuts: ["autonomous irreversible actions without a confirmation step", "presenting generated text as fact with no source or edit path"]
---

# Takeaway

Every AI surface in the brief must state how the user starts, steers, verifies and undoes. Use the catalog `ai-surfaces` entries (agentskit, shadcn chat, cult/ui) for the parts and these patterns for the behavior.
