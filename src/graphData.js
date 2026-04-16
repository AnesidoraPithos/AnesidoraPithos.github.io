export const graphData = {
  nodes: [
    // ── Core ─────────────────────────────────────────────────────────────────
    {
      id: 'mind', name: 'My Mind', group: 0, size: 14,
      description: 'The cartography of a mind at the intersection of neuroscience and machine intelligence — mapping the synaptic bridges between biological cognition and artificial thought.',
      link: null,
    },

    // ── Cluster hubs ─────────────────────────────────────────────────────────
    {
      id: 'bio', name: 'Biological Basis', group: 1, size: 10,
      description: 'The substrate of consciousness: electrochemical signalling, synaptic architecture, and the emergent complexity of living neural tissue that still outperforms any silicon instantiation.',
      link: 'https://en.wikipedia.org/wiki/Neuroscience', linkLabel: 'Neuroscience Overview',
    },
    {
      id: 'ai', name: 'Artificial Intelligence', group: 2, size: 10,
      description: 'Statistical learning systems that approximate aspects of biological intelligence — from gradient-descent optimization to emergent in-context reasoning in large-scale transformer models.',
      link: 'https://en.wikipedia.org/wiki/Artificial_intelligence', linkLabel: 'AI Overview',
    },

    // ── Biological children ───────────────────────────────────────────────────
    {
      id: 'neurons', name: 'Neurons', group: 1, size: 6,
      description: 'The fundamental computational unit of the brain: ~86 billion cells transmitting electrochemical signals across axons and dendrites, encoding information through spike timing and rate coding.',
      link: 'https://en.wikipedia.org/wiki/Neuron', linkLabel: 'Wikipedia: Neuron',
    },
    {
      id: 'synapses', name: 'Synaptic Plasticity', group: 1, size: 6,
      description: 'Hebbian learning made physical — long-term potentiation and depression at the synapse level underpin memory consolidation, skill acquisition, and the brain\'s lifelong capacity for rewiring.',
      link: 'https://en.wikipedia.org/wiki/Synaptic_plasticity', linkLabel: 'Wikipedia: Synaptic Plasticity',
    },
    {
      id: 'prefrontal', name: 'Prefrontal Cortex', group: 1, size: 6,
      description: 'The seat of executive function: working memory, planning, impulse regulation, and abstract reasoning. Disproportionately large in humans — matures last, implicated in everything from policy judgement to creative synthesis.',
      link: 'https://en.wikipedia.org/wiki/Prefrontal_cortex', linkLabel: 'Wikipedia: Prefrontal Cortex',
    },
    {
      id: 'neurotransmitters', name: 'Neurotransmitters', group: 1, size: 5,
      description: 'Chemical messengers — dopamine, serotonin, glutamate, GABA — that modulate neural circuit dynamics. The pharmacological leverage points of mood, motivation, and cognition.',
      link: 'https://en.wikipedia.org/wiki/Neurotransmitter', linkLabel: 'Wikipedia: Neurotransmitter',
    },
    {
      id: 'hippocampus', name: 'Hippocampus & Memory', group: 1, size: 6,
      description: 'Spatial mapping and episodic memory formation via place-cell and grid-cell coding. The hippocampus encodes experience into long-term storage through sharp-wave ripples during sleep.',
      link: 'https://en.wikipedia.org/wiki/Hippocampus', linkLabel: 'Wikipedia: Hippocampus',
    },
    {
      id: 'glia', name: 'Glial Cells', group: 1, size: 5,
      description: 'The underrated majority: astrocytes, microglia, and oligodendrocytes regulate synaptic transmission, neuroinflammation, and myelin maintenance — increasingly linked to cognition beyond mere support.',
      link: 'https://en.wikipedia.org/wiki/Glial_cell', linkLabel: 'Wikipedia: Glial Cells',
    },

    // ── AI children ───────────────────────────────────────────────────────────
    {
      id: 'neural-nets', name: 'Neural Networks', group: 2, size: 6,
      description: 'Layered differentiable functions trained via backpropagation — a mathematical abstraction of biological neural circuitry that, at scale, produces surprisingly capable approximators of perception and reasoning.',
      link: 'https://en.wikipedia.org/wiki/Neural_network_(machine_learning)', linkLabel: 'Wikipedia: Neural Networks',
    },
    {
      id: 'transformers', name: 'Transformers', group: 2, size: 7,
      description: 'The attention-is-all-you-need architecture (Vaswani et al., 2017) that replaced recurrence with parallelizable self-attention — the architectural foundation of every frontier language and vision model.',
      link: 'https://arxiv.org/abs/1706.03762', linkLabel: 'Attention Is All You Need',
    },
    {
      id: 'rl', name: 'Reinforcement Learning', group: 2, size: 6,
      description: 'Reward-maximizing agents learning through environment interaction — from Bellman equations to PPO and RLHF. The computational analogue of dopaminergic reward prediction error circuits.',
      link: 'https://en.wikipedia.org/wiki/Reinforcement_learning', linkLabel: 'Wikipedia: RL',
    },
    {
      id: 'llm', name: 'Large Language Models', group: 2, size: 7,
      description: 'Billion-parameter transformers pre-trained on internet-scale corpora — exhibiting emergent capabilities in reasoning, code generation, and in-context learning that remain theoretically underspecified.',
      link: 'https://en.wikipedia.org/wiki/Large_language_model', linkLabel: 'Wikipedia: LLMs',
    },
    {
      id: 'emergence', name: 'Emergence', group: 2, size: 5,
      description: 'Capabilities that appear discontinuously as a function of scale — chain-of-thought reasoning, arithmetic, translation — challenging the assumption that deep learning progress is smooth and predictable.',
      link: 'https://arxiv.org/abs/2206.07682', linkLabel: 'Emergent Abilities (arXiv)',
    },
    {
      id: 'embeddings', name: 'Embeddings', group: 2, size: 5,
      description: 'Dense vector representations encoding semantic similarity in high-dimensional space — the geometric substrate of meaning in neural language models, analogous to hippocampal population codes.',
      link: 'https://en.wikipedia.org/wiki/Word_embedding', linkLabel: 'Wikipedia: Embeddings',
    },

    // ── Portfolio nodes ───────────────────────────────────────────────────────
    {
      id: 'imda', name: 'IMDA Tech Policy', group: 1, size: 7,
      description: 'Policy advisory work at IMDA — Singapore\'s Infocomm Media Development Authority — shaping AI governance frameworks, data-sharing standards, and digital infrastructure regulation for national-level deployment.',
      link: 'https://www.imda.gov.sg', linkLabel: 'IMDA Singapore',
    },
    {
      id: 'ai-safety', name: 'AI Safety & Red Teaming', group: 2, size: 7,
      description: 'Structured red-teaming and adversarial probing of frontier LLMs — jailbreak taxonomy, multimodal attack surfaces, and emergent misalignment detection. Contributing to open evaluations frameworks for safer AI deployment.',
      link: 'https://github.com', linkLabel: 'View Research',
    },
    {
      id: 'bci', name: 'BCI Digital Twin Startup', group: 0, size: 8,
      description: 'Co-founder of a neurotechnology venture building real-time digital twins of neural activity. Combines BCI hardware pipelines, adaptive signal processing, and personalised cognitive state modelling to bridge brain and machine.',
      link: 'https://github.com', linkLabel: 'View Project',
    },
    {
      id: 'uiuc', name: 'UIUC: CS & Brain Sciences', group: 1, size: 7,
      description: 'Double-degree candidate at the University of Illinois Urbana-Champaign. Computer Science (systems + ML track) alongside Brain & Cognitive Science — bridging algorithmic and biological models of intelligence.',
      link: 'https://cs.illinois.edu', linkLabel: 'UIUC CS',
    },
  ],

  links: [
    // Core → hubs
    { source: 'mind',   target: 'bio',  width: 3 },
    { source: 'mind',   target: 'ai',   width: 3 },

    // Bio hub → children
    { source: 'bio',    target: 'neurons',           width: 2 },
    { source: 'bio',    target: 'synapses',          width: 2 },
    { source: 'bio',    target: 'prefrontal',        width: 2 },
    { source: 'bio',    target: 'neurotransmitters', width: 1.5 },
    { source: 'bio',    target: 'hippocampus',       width: 2 },
    { source: 'bio',    target: 'glia',              width: 1.5 },

    // AI hub → children
    { source: 'ai',     target: 'neural-nets',       width: 2 },
    { source: 'ai',     target: 'transformers',      width: 2 },
    { source: 'ai',     target: 'rl',                width: 2 },
    { source: 'ai',     target: 'llm',               width: 2 },
    { source: 'ai',     target: 'emergence',         width: 1.5 },
    { source: 'ai',     target: 'embeddings',        width: 1.5 },

    // Cross-cluster bridges
    { source: 'neurons',     target: 'neural-nets',  width: 1 },
    { source: 'synapses',    target: 'rl',           width: 1 },
    { source: 'hippocampus', target: 'embeddings',   width: 1 },
    { source: 'prefrontal',  target: 'emergence',    width: 1 },

    // Portfolio nodes — frontal lobe
    { source: 'prefrontal',  target: 'imda',         width: 1.5 },
    { source: 'bio',         target: 'imda',         width: 1 },
    { source: 'ai',          target: 'ai-safety',    width: 2 },
    { source: 'llm',         target: 'ai-safety',    width: 1 },

    // Portfolio nodes — brain stem / core
    { source: 'mind',        target: 'bci',          width: 2 },
    { source: 'bio',         target: 'bci',          width: 1.5 },
    { source: 'ai',          target: 'bci',          width: 1.5 },

    // Portfolio nodes — temporal / parietal
    { source: 'mind',        target: 'uiuc',         width: 1.5 },
    { source: 'bio',         target: 'uiuc',         width: 1 },
  ],
};
