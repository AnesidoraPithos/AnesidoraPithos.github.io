export const graphData = {
  nodes: [
    // ── CORE (Center) ────────────────────────────────────────────────────────
    {
      id: 'mind', name: 'My Mind', group: 0, size: 14, lobe: 'center',
      description: 'The cartography of a mind at the intersection of neuroscience and machine intelligence.',
      complexity: 'O(∞)',
    },

    // ── THE 6 PILLARS (Your Specific Content) ────────────────────────────────
    {
      id: 'ai-safety', name: 'AI Safety Research', group: 2, size: 9, lobe: 'frontal',
      description: 'Research Engineer focus: AI misuse, manipulation, and adversarial model bias.',
      complexity: 'O(n log n)',
    },
    {
      id: 'uiuc', name: 'Dual Degree: CS & BCS', group: 1, size: 9, lobe: 'frontal',
      description: 'Bridging Computer Science and Brain & Cognitive Science at UIUC — mapping algorithmic logic to biological wetware.',
      complexity: 'O(n²)',
    },
    {
      id: 'bci', name: 'BCI: Digital Twin', group: 0, size: 9, lobe: 'temporal', side: 'right',
      description: 'Research Project: Building a digital twin to investigate the potential for immortalizing human cognition.',
      complexity: 'O(2ⁿ)',
    },
    {
      id: 'druids', name: 'Little Druids', group: 3, size: 8, lobe: 'occipital',
      description: 'Home nursery raising baby plants and succulents for faires and conventions.',
      complexity: 'O(1)',
    },
    {
      id: 'gamedev', name: 'Game Development', group: 3, size: 8, lobe: 'temporal', side: 'right',
      description: 'Exploring interactive narrative and simulation as a medium for emergent AI behaviors.',
      complexity: 'O(n log n)',
    },
    {
      id: 'cosplay', name: 'Structural Synthesis', group: 3, size: 8, lobe: 'parietal',
      description: 'Translating abstract character designs into physical, wearable engineering.',
      complexity: 'O(n²)',
    },

    // ── BIOLOGICAL NODES ──────────────────────────────────────────────────────
    {
      id: 'neurons', name: 'Neurons', group: 1, size: 6, lobe: 'temporal', side: 'left',
      description: 'The fundamental computational unit. Eighty-six billion of them fire in overlapping cascades, implementing everything cognition has ever produced.',
      complexity: 'O(n)',
    },
    {
      id: 'synapses', name: 'Synaptic Plasticity', group: 1, size: 6, lobe: 'temporal', side: 'right',
      description: 'The gap between neurons is not empty — it is the site of all learning. Hebbian plasticity, long-term potentiation, and the precise timing of spike pairs encode memory as a physical rearrangement of the world.',
      complexity: 'O(n²)',
    },
    {
      id: 'prefrontal', name: 'Prefrontal Cortex', group: 1, size: 7, lobe: 'frontal',
      description: 'The executive cortex — seat of planning, inhibition, and working memory. It is the region most recently evolved, most susceptible to stress, and most implicated in what makes human cognition distinct from brute optimization.',
      link: 'https://en.wikipedia.org/wiki/Prefrontal_cortex',
      linkLabel: 'Wikipedia',
      complexity: 'O(log n)',
    },
    {
      id: 'hippocampus', name: 'Hippocampus', group: 1, size: 6, lobe: 'temporal', side: 'left',
      description: "The brain's index of place and time. It encodes episodic memory as spatial trajectories — the same architecture that navigates mazes and consolidates sleep.",
      link: 'https://en.wikipedia.org/wiki/Hippocampus',
      linkLabel: 'Wikipedia',
      complexity: 'O(n log n)',
    },
    {
      id: 'neurotransmitters', name: 'Neurotransmitters', group: 1, size: 5, lobe: 'center',
      description: 'Dopamine is not pleasure — it is prediction error. Serotonin is not happiness — it is social rank calculation. Every named emotional state dissolves, at the molecular level, into concentration gradients and receptor affinities.',
      complexity: 'O(n)',
    },

    // ── MACHINE LEARNING NODES ────────────────────────────────────────────────
    {
      id: 'neural-nets', name: 'Neural Networks', group: 2, size: 6, lobe: 'frontal',
      description: 'Inspired by, but not equivalent to, biological neural tissue. The artificial neuron creates something new: a differentiable function approximator of arbitrary power.',
      complexity: 'O(n³)',
    },
    {
      id: 'transformers', name: 'Transformers', group: 2, size: 7, lobe: 'frontal',
      description: "The attention mechanism is the transformer's defining gesture: every token attending to every other, weighting relevance across context. What emerged from scaling this architecture was not merely pattern-matching.",
      link: 'https://arxiv.org/abs/1706.03762',
      linkLabel: 'Attention Is All You Need',
      complexity: 'O(n²·d)',
    },
    {
      id: 'rl', name: 'Reinforcement Learning', group: 2, size: 6, lobe: 'frontal',
      description: 'An agent acting in an environment, maximizing delayed reward through trial and error. The framework is brutally general — it has no prior knowledge of what the reward means. This is both its power and its alignment risk.',
      complexity: 'O(n!)',
    },
    {
      id: 'llm', name: 'Large Language Models', group: 2, size: 7, lobe: 'frontal',
      description: 'A language model trained on human text at civilizational scale develops an internal model of the world — not because it was told to, but because world-modeling is compression, and compression is the objective.',
      complexity: 'O(n²·d)',
    },
    {
      id: 'embeddings', name: 'Embeddings', group: 2, size: 5, lobe: 'temporal', side: 'left',
      description: 'The transformation of discrete symbols into continuous geometric space, where semantic distance becomes Euclidean distance. The embedding manifold is the substrate on which language models reason.',
      complexity: 'O(n·d)',
    },

    // ── AI SAFETY DEPTH (Frontal) ─────────────────────────────────────────────
    {
      id: 'interpretability', name: 'Mechanistic Interpretability', group: 2, size: 8, lobe: 'frontal',
      description: 'The practice of reverse-engineering the internal circuitry of neural networks — tracing how raw token probabilities crystallize into deception, bias, or world-models. Every superposition vector is a secret the model did not choose to keep.',
      link: 'https://distill.pub/2020/circuits/',
      linkLabel: 'Circuits Thread',
      complexity: 'O(n!)',
    },
    {
      id: 'alignment', name: 'AI Alignment Theory', group: 2, size: 8, lobe: 'frontal',
      description: 'The formal pursuit of making powerful optimization processes pursue goals humans actually endorse. Not safety by policy, but safety by structure — value loading, corrigibility, and the geometry of intent.',
      link: 'https://www.alignmentforum.org/',
      linkLabel: 'Alignment Forum',
      complexity: 'O(∞)',
    },
    {
      id: 'adversarial', name: 'Adversarial Attacks', group: 2, size: 7, lobe: 'frontal',
      description: 'Red-teaming language models to expose latent failure modes: prompt injection, jailbreaks, and the manipulation of model beliefs through adversarially crafted context. The attacker reveals what the defender refused to imagine.',
      complexity: 'O(n³)',
    },
    {
      id: 'rlhf', name: 'RLHF / Constitutional AI', group: 2, size: 7, lobe: 'frontal',
      description: 'Reinforcement Learning from Human Feedback encodes approval into reward signals. Constitutional AI replaces the human rater with a set of principles — asking the model to critique itself.',
      link: 'https://arxiv.org/abs/2212.08073',
      linkLabel: 'Constitutional AI Paper',
      complexity: 'O(n²)',
    },

    // ── NEURO DEPTH (Temporal / Center) ──────────────────────────────────────
    {
      id: 'neuroplasticity', name: 'Neuroplasticity', group: 1, size: 7, lobe: 'temporal', side: 'right',
      description: "The brain's capacity to rewrite its own wiring in response to experience. Long-term potentiation, synaptic pruning, and cortical remapping — the biological proof that the map is never fixed, only provisional.",
      link: 'https://en.wikipedia.org/wiki/Neuroplasticity',
      linkLabel: 'Wikipedia',
      complexity: 'O(n log n)',
    },
    {
      id: 'cognitive-architecture', name: 'Cognitive Architecture', group: 1, size: 7, lobe: 'center',
      description: 'The structural principles governing how minds — biological or artificial — organize perception, memory, and inference into coherent behavior. The blueprint beneath intelligence.',
      complexity: 'O(n!)',
    },
  ],

  links: [
    // Core → Main Pillars
    { source: 'mind', target: 'ai-safety', width: 3 },
    { source: 'mind', target: 'uiuc', width: 3 },
    { source: 'mind', target: 'bci', width: 3 },
    { source: 'mind', target: 'druids', width: 2 },
    { source: 'mind', target: 'gamedev', width: 2 },
    { source: 'mind', target: 'cosplay', width: 2 },

    // Thematic Bridges
    { source: 'ai-safety', target: 'llm', width: 1.5 },
    { source: 'uiuc', target: 'prefrontal', width: 1.5 },
    { source: 'bci', target: 'hippocampus', width: 1.5 },
    { source: 'bci', target: 'embeddings', width: 1.5 },
    { source: 'druids', target: 'neurons', width: 1 },
    { source: 'gamedev', target: 'neural-nets', width: 1 },

    // AI Safety depth
    { source: 'ai-safety', target: 'interpretability', width: 2 },
    { source: 'ai-safety', target: 'alignment', width: 2 },
    { source: 'ai-safety', target: 'adversarial', width: 1.5 },
    { source: 'ai-safety', target: 'rlhf', width: 1.5 },
    { source: 'alignment', target: 'rlhf', width: 1 },
    { source: 'interpretability', target: 'transformers', width: 1 },
    { source: 'adversarial', target: 'llm', width: 1 },

    // Neuro depth
    { source: 'bci', target: 'neuroplasticity', width: 1.5 },
    { source: 'synapses', target: 'neuroplasticity', width: 1 },
    { source: 'uiuc', target: 'cognitive-architecture', width: 1.5 },
    { source: 'cognitive-architecture', target: 'prefrontal', width: 1 },
    { source: 'cognitive-architecture', target: 'neural-nets', width: 1 },

    // Lone wolf fixes
    { source: 'neurotransmitters', target: 'synapses', width: 1 },
    { source: 'rl', target: 'neural-nets', width: 1 },
    { source: 'rl', target: 'rlhf', width: 1 },
  ],
};
