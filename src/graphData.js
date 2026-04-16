export const graphData = {
  nodes: [
    // ── CORE (Center) ────────────────────────────────────────────────────────
    {
      id: 'mind', name: 'My Mind', group: 0, size: 14, lobe: 'center',
      description: 'The cartography of a mind at the intersection of neuroscience and machine intelligence.',
    },

    // ── THE 6 PILLARS (Your Specific Content) ────────────────────────────────
    {
      id: 'ai-safety', name: 'AI Safety Research', group: 2, size: 9, lobe: 'frontal',
      description: 'Research Engineer focus: AI misuse, manipulation, and adversarial model bias.',
    },
    {
      id: 'uiuc', name: 'Dual Degree: CS & BCS', group: 1, size: 9, lobe: 'frontal',
      description: 'Bridging Computer Science and Brain & Cognitive Science at UIUC — mapping algorithmic logic to biological wetware.',
    },
    {
      id: 'bci', name: 'BCI: Digital Twin', group: 0, size: 9, lobe: 'temporal',
      description: 'Research Project: Building a digital twin to investigate the potential for immortalizing human cognition.',
    },
    {
      id: 'druids', name: 'Little Druids', group: 3, size: 8, lobe: 'occipital',
      description: 'Home nursery raising baby plants and succulents for faires and conventions.',
    },
    {
      id: 'gamedev', name: 'Game Development', group: 3, size: 8, lobe: 'temporal',
      description: 'Exploring interactive narrative and simulation as a medium for emergent AI behaviors.',
    },
    {
      id: 'cosplay', name: 'Structural Synthesis', group: 3, size: 8, lobe: 'parietal',
      description: 'Translating abstract character designs into physical, wearable engineering.',
    },

    // ── BIOLOGICAL NODES (Temporal/Center) ────────────────────────────────────
    { id: 'neurons', name: 'Neurons', group: 1, size: 6, lobe: 'temporal' },
    { id: 'synapses', name: 'Synaptic Plasticity', group: 1, size: 6, lobe: 'temporal' },
    { id: 'prefrontal', name: 'Prefrontal Cortex', group: 1, size: 7, lobe: 'frontal' },
    { id: 'hippocampus', name: 'Hippocampus', group: 1, size: 6, lobe: 'temporal' },
    { id: 'neurotransmitters', name: 'Neurotransmitters', group: 1, size: 5, lobe: 'center' },

    // ── MACHINE LEARNING NODES (Frontal) ──────────────────────────────────────
    { id: 'neural-nets', name: 'Neural Networks', group: 2, size: 6, lobe: 'frontal' },
    { id: 'transformers', name: 'Transformers', group: 2, size: 7, lobe: 'frontal' },
    { id: 'rl', name: 'Reinforcement Learning', group: 2, size: 6, lobe: 'frontal' },
    { id: 'llm', name: 'Large Language Models', group: 2, size: 7, lobe: 'frontal' },
    { id: 'embeddings', name: 'Embeddings', group: 2, size: 5, lobe: 'temporal' },
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
  ]
};