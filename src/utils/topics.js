const TOPICS = [
  {
    label: 'Personal Growth & Self-Improvement',
    signals: [
      'grow', 'growth', 'improve', 'improvement', 'develop', 'development', 'self',
      'better', 'change', 'progress', 'evolve', 'evolution', 'potential', 'become',
      'transform', 'transformation', 'journey', 'path', 'learn', 'lesson', 'habit',
      'discipline', 'goal', 'ambition', 'aspire', 'motivation', 'reflect', 'reflection',
    ],
    domains: ['self-help', 'psychology', 'philosophy'],
  },
  {
    label: 'Humility & Self-Awareness',
    signals: [
      'humble', 'humility', 'modest', 'modesty', 'ego', 'pride', 'arrogant', 'vain',
      'self-aware', 'self-awareness', 'introspect', 'introspection', 'flaw', 'weakness',
      'limitation', 'acknowledge', 'admit', 'accept', 'acceptance', 'vulnerable',
      'vulnerability', 'honest', 'honesty',
    ],
    domains: ['self-help', 'philosophy', 'psychology'],
  },
  {
    label: 'Honesty & Integrity',
    signals: [
      'honest', 'honesty', 'truth', 'truthful', 'integrity', 'authentic', 'authenticity',
      'genuine', 'sincere', 'sincerity', 'transparent', 'transparency', 'moral',
      'morality', 'ethic', 'ethics', 'ethical', 'principle', 'values', 'character',
      'conscience', 'virtue', 'virtuous',
    ],
    domains: ['philosophy', 'self-help', 'ethics'],
  },
  {
    label: 'Trust & Reliability',
    signals: [
      'trust', 'trustworthy', 'trustworthiness', 'rely', 'reliable', 'reliability',
      'depend', 'dependable', 'faith', 'loyal', 'loyalty', 'commit', 'commitment',
      'consistent', 'consistency', 'accountable', 'accountability', 'responsible',
      'responsibility',
    ],
    domains: ['relationships', 'self-help', 'business'],
  },
  {
    label: 'Courage & Resilience',
    signals: [
      'courage', 'brave', 'bravery', 'fearless', 'bold', 'daring', 'valiant', 'heroic',
      'fortitude', 'persevere', 'perseverance', 'persist', 'persistence', 'resilient',
      'resilience', 'endure', 'endurance', 'determination', 'grit', 'tenacity',
      'strength', 'overcome', 'survive', 'survival',
    ],
    domains: ['self-help', 'psychology', 'inspiration'],
  },
  {
    label: 'Mistakes & Learning',
    signals: [
      'mistake', 'error', 'fail', 'failure', 'shortcoming', 'flaw', 'wrong',
      'misstep', 'setback', 'stumble', 'fall', 'lesson', 'learn', 'growth',
      'improve', 'improvement', 'feedback', 'criticism', 'correct', 'correction',
      'redeem', 'redemption',
    ],
    domains: ['self-help', 'education', 'psychology'],
  },
  {
    label: 'Happiness & Gratitude',
    signals: [
      'happy', 'happiness', 'joy', 'joyful', 'delight', 'pleasure', 'satisfaction',
      'content', 'contentment', 'grateful', 'gratitude', 'thankful', 'thankfulness',
      'bless', 'blessing', 'appreciate', 'appreciation', 'fulfill', 'fulfillment',
      'bliss', 'elation', 'cheerful',
    ],
    domains: ['self-help', 'psychology', 'spirituality'],
  },
  {
    label: 'Fear & Anxiety',
    signals: [
      'fear', 'fearful', 'anxiety', 'anxious', 'worry', 'worried', 'panic', 'scared',
      'afraid', 'dread', 'terror', 'horror', 'phobia', 'nervous', 'nervousness',
      'unease', 'uneasy', 'restless', 'apprehensive', 'tension', 'tense',
      'distress', 'alarm',
    ],
    domains: ['psychology', 'self-help', 'health'],
  },
  {
    label: 'Grief & Loss',
    signals: [
      'grief', 'grieve', 'grieving', 'loss', 'lose', 'lost', 'sorrow', 'sorrowful',
      'mourn', 'mourning', 'sad', 'sadness', 'pain', 'suffer', 'suffering',
      'anguish', 'despair', 'heartache', 'heartbreak', 'broken', 'devastate',
      'devastation', 'bereave', 'bereavement',
    ],
    domains: ['psychology', 'emotions', 'spirituality'],
  },
  {
    label: 'Compassion & Empathy',
    signals: [
      'compassion', 'compassionate', 'empathy', 'empathize', 'kind', 'kindness',
      'gentle', 'gentleness', 'warmth', 'caring', 'care', 'tender', 'tenderness',
      'sympathy', 'sympathize', 'understanding', 'understanding', 'supportive',
      'nurture', 'nurturing', 'benevolent', 'altruism', 'altruistic',
    ],
    domains: ['psychology', 'relationships', 'spirituality'],
  },
  {
    label: 'Love & Relationships',
    signals: [
      'love', 'lover', 'beloved', 'romance', 'romantic', 'passion', 'passionate',
      'intimate', 'intimacy', 'affection', 'affectionate', 'devotion', 'devoted',
      'adore', 'adoration', 'cherish', 'treasure', 'soulmate', 'partner',
      'relationship', 'couple', 'marriage', 'married', 'wedding', 'spouse',
    ],
    domains: ['relationships', 'emotions', 'fiction'],
  },
  {
    label: 'Friendship & Connection',
    signals: [
      'friend', 'friendship', 'buddy', 'companion', 'companionship', 'mate',
      'ally', 'bond', 'connected', 'connection', 'together', 'togetherness',
      'brotherhood', 'sisterhood', 'camaraderie', 'solidarity', 'fellowship',
      'neighbor', 'neighborly', 'community',
    ],
    domains: ['relationships', 'social', 'fiction'],
  },
  {
    label: 'Family & Belonging',
    signals: [
      'family', 'familial', 'parent', 'mother', 'father', 'child', 'children',
      'sibling', 'brother', 'sister', 'grandparent', 'ancestor', 'heritage',
      'lineage', 'kin', 'kinship', 'clan', 'tribe', 'belong', 'belonging',
      'home', 'homeland', 'root', 'roots',
    ],
    domains: ['relationships', 'social', 'fiction'],
  },
  {
    label: 'Communication & Dialogue',
    signals: [
      'communicate', 'communication', 'conversation', 'dialogue', 'discuss',
      'discussion', 'express', 'expression', 'share', 'sharing', 'speak',
      'talk', 'listen', 'listening', 'respond', 'response', 'reply',
      'argue', 'argument', 'debate', 'negotiate', 'negotiation', 'persuade',
      'persuasion',
    ],
    domains: ['relationships', 'business', 'self-help'],
  },
  {
    label: 'Feedback & Constructive Dialogue',
    signals: [
      'feedback', 'advice', 'counsel', 'guidance', 'criticism', 'critique',
      'constructive', 'suggest', 'suggestion', 'input', 'opinion', 'perspective',
      'review', 'evaluate', 'evaluation', 'assess', 'assessment', 'coach',
      'mentor', 'mentorship',
    ],
    domains: ['business', 'education', 'self-help'],
  },
  {
    label: 'Emotions & Feelings',
    signals: [
      'emotion', 'emotional', 'emotionally', 'feel', 'feeling', 'feelings',
      'sentiment', 'mood', 'affect', 'sensitive', 'sensitivity', 'heart',
      'heartfelt', 'passion', 'temper', 'temperament', 'reaction', 'response',
      'expression', 'express',
    ],
    domains: ['psychology', 'emotions', 'fiction'],
  },
  {
    label: 'Healing & Recovery',
    signals: [
      'heal', 'healing', 'recover', 'recovery', 'therapy', 'therapeutic',
      'counseling', 'rehab', 'rehabilitation', 'restore', 'restoration',
      'mend', 'repair', 'closure', 'peace', 'forgive', 'forgiveness',
      'let go', 'release', 'moving on',
    ],
    domains: ['psychology', 'health', 'spirituality'],
  },
  {
    label: 'Mental Health & Wellness',
    signals: [
      'mental', 'mental health', 'wellness', 'wellbeing', 'well-being',
      'mind', 'mindful', 'mindfulness', 'meditate', 'meditation', 'stress',
      'burnout', 'depression', 'depressed', 'therapy', 'therapist', 'counselor',
      'psychology', 'psychologist', 'psychiatrist', 'self-care', 'selfcare',
    ],
    domains: ['health', 'psychology', 'self-help'],
  },
  {
    label: 'Purpose & Meaning',
    signals: [
      'purpose', 'meaning', 'meaningful', 'meaninglessness', 'fulfill',
      'fulfillment', 'calling', 'vocation', 'mission', 'destiny', 'fate',
      'reason', 'significant', 'significance', 'matter', 'importance',
      'essential', 'profound', 'deep', 'depth',
    ],
    domains: ['philosophy', 'spirituality', 'self-help'],
  },
  {
    label: 'Philosophy & Existentialism',
    signals: [
      'philosophy', 'philosopher', 'existential', 'existence', 'being',
      'essence', 'consciousness', 'reality', 'truth', 'knowledge', 'wisdom',
      'reason', 'logic', 'rational', 'metaphysics', 'ontology', 'ethics',
      'morality', 'free will', 'determinism', 'nihilism', 'absurd',
    ],
    domains: ['philosophy', 'academic', 'fiction'],
  },
  {
    label: 'Spirituality & Faith',
    signals: [
      'spirit', 'spiritual', 'spirituality', 'faith', 'belief', 'believe',
      'soul', 'divine', 'sacred', 'holy', 'pray', 'prayer', 'meditate',
      'meditation', 'transcend', 'transcendence', 'enlightenment', 'grace',
      'blessing', 'miracle', 'mystic', 'mystical', 'religion', 'religious',
      'god', 'universe', 'cosmic', 'inner peace',
    ],
    domains: ['spirituality', 'philosophy', 'self-help'],
  },
  {
    label: 'Curiosity & Discovery',
    signals: [
      'curious', 'curiosity', 'wonder', 'wonderment', 'fascinate', 'fascination',
      'explore', 'exploration', 'explorer', 'discover', 'discovery', 'inquisitive',
      'question', 'questioning', 'seek', 'search', 'inquiry', 'investigate',
      'investigation', 'probe', 'examine', 'observe',
    ],
    domains: ['science', 'education', 'philosophy'],
  },
  {
    label: 'Creativity & Imagination',
    signals: [
      'creative', 'creativity', 'imagine', 'imagination', 'invent', 'invention',
      'innovate', 'innovation', 'original', 'originality', 'novel', 'novelty',
      'vision', 'visionary', 'inspire', 'inspiration', 'artistic', 'express',
      'expression', 'idea', 'ideas', 'conceive', 'concept',
    ],
    domains: ['art', 'self-help', 'business'],
  },
  {
    label: 'Art & Aesthetics',
    signals: [
      'art', 'arts', 'artist', 'artistic', 'aesthetic', 'aesthetics', 'beauty',
      'beautiful', 'sublime', 'elegant', 'elegance', 'painting', 'sculpture',
      'drawing', 'sketch', 'canvas', 'gallery', 'museum', 'exhibition',
      'color', 'form', 'composition', 'masterpiece',
    ],
    domains: ['art', 'culture', 'fiction'],
  },
  {
    label: 'Music & Sound',
    signals: [
      'music', 'musical', 'musician', 'song', 'melody', 'melodic', 'rhythm',
      'harmony', 'note', 'tune', 'symphony', 'orchestra', 'instrument',
      'guitar', 'piano', 'violin', 'drum', 'vocal', 'voice', 'choir',
      'concert', 'performance', 'compose', 'composition',
    ],
    domains: ['art', 'culture', 'entertainment'],
  },
  {
    label: 'Literature & Writing',
    signals: [
      'literature', 'literary', 'book', 'books', 'novel', 'poetry', 'poem',
      'poet', 'write', 'writer', 'writing', 'author', 'story', 'stories',
      'narrative', 'prose', 'verse', 'chapter', 'page', 'publish',
      'publication', 'manuscript', 'essay', 'fiction',
    ],
    domains: ['art', 'culture', 'education'],
  },
  {
    label: 'Technology & Innovation',
    signals: [
      'technology', 'technological', 'tech', 'digital', 'innovation',
      'innovative', 'invent', 'invention', 'software', 'hardware', 'compute',
      'computer', 'computing', 'algorithm', 'data', 'artificial', 'intelligence',
      'ai', 'machine learning', 'automation', 'robot', 'robotics', 'internet',
      'web', 'app', 'application', 'platform', 'system', 'electronic',
      'device', 'gadget', 'coding', 'programming',
    ],
    domains: ['technology', 'science', 'business'],
  },
  {
    label: 'AI & Machine Learning',
    signals: [
      'artificial intelligence', 'ai', 'machine learning', 'deep learning',
      'neural network', 'algorithm', 'data science', 'training', 'model',
      'inference', 'llm', 'large language model', 'transformer', 'gpt',
      'chatbot', 'automation', 'reinforcement', 'supervised', 'unsupervised',
      'computer vision', 'nlp', 'natural language',
    ],
    domains: ['technology', 'science', 'business'],
  },
  {
    label: 'Technology & Ethics',
    signals: [
      'ai ethics', 'tech ethics', 'algorithmic bias', 'privacy', 'surveillance',
      'data privacy', 'responsible', 'accountability', 'regulation',
      'ethical', 'morality', 'human rights', 'digital rights', 'consent',
      'transparency', 'explainability', 'fairness', 'bias', 'discrimination',
      'safety', 'alignment',
    ],
    domains: ['technology', 'philosophy', 'society'],
  },
  {
    label: 'Technology & Society',
    signals: [
      'digital age', 'information age', 'social media', 'screen time',
      'digital native', 'online', 'internet', 'connectivity', 'network',
      'digital divide', 'technological change', 'automation', 'future of work',
      'remote work', 'gig economy', 'platform', 'digital transformation',
      'smart', 'connected',
    ],
    domains: ['technology', 'society', 'business'],
  },
  {
    label: 'Science & Research',
    signals: [
      'science', 'scientific', 'scientist', 'research', 'researcher',
      'experiment', 'experimental', 'laboratory', 'lab', 'study', 'studies',
      'hypothesis', 'theory', 'theoretical', 'empirical', 'evidence',
      'data', 'analysis', 'methodology', 'peer review', 'discovery',
      'breakthrough', 'observation',
    ],
    domains: ['science', 'education', 'technology'],
  },
  {
    label: 'Environment & Nature',
    signals: [
      'nature', 'natural', 'environment', 'environmental', 'earth', 'planet',
      'wilderness', 'landscape', 'forest', 'ocean', 'river', 'mountain',
      'sky', 'tree', 'flower', 'garden', 'animal', 'bird', 'ecosystem',
      'climate', 'weather', 'season', 'outdoor',
    ],
    domains: ['nature', 'science', 'lifestyle'],
  },
  {
    label: 'Environmental Conservation',
    signals: [
      'conservation', 'conserve', 'protect', 'protection', 'preserve',
      'preservation', 'sustainable', 'sustainability', 'renewable',
      'green', 'eco-friendly', 'carbon', 'emission', 'pollution',
      'recycle', 'recycling', 'waste', 'biodiversity', 'endangered',
      'species', 'wildlife', 'habitat', 'extinction', 'climate change',
      'global warming', 'restoration',
    ],
    domains: ['environment', 'science', 'society'],
  },
  {
    label: 'Environmental Technology',
    signals: [
      'clean tech', 'green tech', 'solar', 'wind', 'renewable energy',
      'carbon capture', 'electric vehicle', 'smart grid', 'sustainable',
      'technology', 'monitor', 'tracking', 'sensor', 'drone', 'satellite',
      'precision agriculture', 'conservation technology',
    ],
    domains: ['environment', 'technology', 'science'],
  },
  {
    label: 'Health & Medicine',
    signals: [
      'health', 'healthy', 'medical', 'medicine', 'doctor', 'physician',
      'nurse', 'hospital', 'clinic', 'patient', 'treatment', 'therapy',
      'diagnosis', 'disease', 'illness', 'symptom', 'surgery', 'drug',
      'vaccine', 'prevention', 'wellness', 'nutrition', 'diet', 'exercise',
      'fitness',
    ],
    domains: ['health', 'science', 'lifestyle'],
  },
  {
    label: 'Biology & Life Sciences',
    signals: [
      'biology', 'biological', 'biologist', 'genetics', 'gene', 'dna',
      'evolution', 'species', 'cell', 'organism', 'ecosystem', 'molecular',
      'biochemistry', 'neuroscience', 'physiology', 'anatomy', 'microbe',
      'bacteria', 'virus', 'immunology',
    ],
    domains: ['science', 'health', 'education'],
  },
  {
    label: 'Physics & Astronomy',
    signals: [
      'physics', 'physicist', 'quantum', 'relativity', 'gravity', 'particle',
      'atom', 'molecule', 'energy', 'force', 'matter', 'space', 'time',
      'astronomy', 'astronomer', 'star', 'planet', 'galaxy', 'universe',
      'cosmos', 'telescope', 'orbit', 'black hole',
    ],
    domains: ['science', 'education', 'philosophy'],
  },
  {
    label: 'Education & Learning',
    signals: [
      'education', 'educational', 'teach', 'teacher', 'teaching', 'learn',
      'learning', 'student', 'study', 'studying', 'school', 'classroom',
      'college', 'university', 'academic', 'course', 'curriculum', 'lesson',
      'training', 'skill', 'knowledge', 'tutor', 'homework', 'exam',
    ],
    domains: ['education', 'career', 'self-help'],
  },
  {
    label: 'Business & Entrepreneurship',
    signals: [
      'business', 'entrepreneur', 'entrepreneurship', 'startup', 'company',
      'corporation', 'enterprise', 'market', 'marketing', 'sales', 'revenue',
      'profit', 'investment', 'investor', 'funding', 'venture', 'capital',
      'strategy', 'management', 'leadership', 'growth', 'scale', 'customer',
      'client', 'product', 'service',
    ],
    domains: ['business', 'career', 'finance'],
  },
  {
    label: 'Finance & Economics',
    signals: [
      'finance', 'financial', 'money', 'bank', 'banking', 'invest', 'investment',
      'stock', 'market', 'economy', 'economic', 'inflation', 'interest',
      'debt', 'credit', 'loan', 'mortgage', 'tax', 'budget', 'saving',
      'wealth', 'asset', 'portfolio', 'retirement', 'cryptocurrency',
    ],
    domains: ['finance', 'business', 'career'],
  },
  {
    label: 'Leadership & Management',
    signals: [
      'leader', 'leadership', 'manage', 'management', 'manager', 'direct',
      'direction', 'guide', 'guide', 'mentor', 'coach', 'supervise',
      'supervisor', 'team', 'teamwork', 'organize', 'organization',
      'execute', 'execution', 'decision', 'strategy', 'vision',
      'influence', 'motivate', 'inspire',
    ],
    domains: ['business', 'career', 'self-help'],
  },
  {
    label: 'Career & Professional Development',
    signals: [
      'career', 'job', 'work', 'workplace', 'profession', 'professional',
      'employment', 'hire', 'hiring', 'resume', 'interview', 'promotion',
      'salary', 'raise', 'skill', 'skill', 'training', 'development',
      'networking', 'mentor', 'internship', 'freelance', 'remote',
    ],
    domains: ['career', 'business', 'self-help'],
  },
  {
    label: 'Politics & Governance',
    signals: [
      'politics', 'political', 'politician', 'government', 'governance',
      'democracy', 'democratic', 'republic', 'policy', 'law', 'legislation',
      'congress', 'parliament', 'senate', 'election', 'vote', 'voting',
      'campaign', 'party', 'president', 'prime minister', 'cabinet',
      'administration', 'bureaucracy', 'reform',
    ],
    domains: ['politics', 'society', 'history'],
  },
  {
    label: 'Society & Culture',
    signals: [
      'society', 'societal', 'social', 'cultural', 'culture', 'community',
      'public', 'civic', 'citizen', 'citizenship', 'norm', 'tradition',
      'convention', 'custom', 'heritage', 'identity', 'diverse', 'diversity',
      'pluralism', 'tolerance', 'inclusion', 'inclusive',
    ],
    domains: ['society', 'culture', 'anthropology'],
  },
  {
    label: 'Justice & Human Rights',
    signals: [
      'justice', 'injustice', 'fair', 'fairness', 'unfair', 'equality',
      'equal', 'inequality', 'equity', 'right', 'rights', 'human rights',
      'civil rights', 'freedom', 'liberty', 'dignity', 'discrimination',
      'oppression', 'marginalized', 'privilege', 'advocacy', 'activism',
    ],
    domains: ['society', 'politics', 'philosophy'],
  },
  {
    label: 'History & Historical Analysis',
    signals: [
      'history', 'historical', 'historian', 'ancient', 'medieval', 'modern',
      'era', 'epoch', 'century', 'decade', 'civilization', 'empire',
      'revolution', 'war', 'battle', 'conflict', 'treaty', 'dynasty',
      'kingdom', 'colony', 'colonial', 'independence', 'movement',
    ],
    domains: ['history', 'academic', 'culture'],
  },
  {
    label: 'War & Conflict',
    signals: [
      'war', 'warfare', 'battle', 'fight', 'fighting', 'conflict', 'combat',
      'soldier', 'military', 'army', 'navy', 'weapon', 'violence', 'violent',
      'attack', 'invasion', 'defense', 'casualty', 'peace', 'ceasefire',
      'truce', 'negotiation', 'surrender',
    ],
    domains: ['history', 'politics', 'fiction'],
  },
  {
    label: 'Peace & Conflict Resolution',
    signals: [
      'peace', 'peaceful', 'peacemaking', 'diplomacy', 'diplomatic',
      'negotiate', 'negotiation', 'mediation', 'reconcile', 'reconciliation',
      'harmony', 'understanding', 'truce', 'ceasefire', 'dialogue',
      'cooperation', 'collaboration', 'compromise', 'resolution',
    ],
    domains: ['politics', 'society', 'relationships'],
  },
  {
    label: 'Race & Identity',
    signals: [
      'race', 'racial', 'racism', 'racist', 'ethnicity', 'ethnic',
      'identity', 'cultural identity', 'diaspora', 'immigrant', 'immigration',
      'migrant', 'refugee', 'segregation', 'integration', 'multicultural',
      'heritage', 'ancestry', 'belonging', 'otherness',
    ],
    domains: ['society', 'politics', 'culture'],
  },
  {
    label: 'Gender & Feminism',
    signals: [
      'gender', 'feminism', 'feminist', 'patriarchy', 'sexism', 'misogyny',
      'equality', 'empowerment', 'woman', 'women', 'man', 'men', 'masculinity',
      'femininity', 'stereotype', 'gender role', 'lgbtq', 'queer',
      'transgender', 'non-binary',
    ],
    domains: ['society', 'politics', 'culture'],
  },
  {
    label: 'Psychology & Human Behavior',
    signals: [
      'psychology', 'psychological', 'psychologist', 'behavior', 'behavioral',
      'mind', 'mental', 'cognitive', 'perception', 'personality', 'trait',
      'motivation', 'emotion', 'attitude', 'belief', 'cognition',
      'consciousness', 'subconscious', 'unconscious', 'memory', 'learning',
      'conditioning', 'reinforcement',
    ],
    domains: ['psychology', 'science', 'self-help'],
  },
  {
    label: 'Memory & Nostalgia',
    signals: [
      'memory', 'memories', 'remember', 'reminisce', 'reminiscence',
      'nostalgia', 'nostalgic', 'past', 'childhood', 'recollection',
      'forget', 'forgotten', 'flashback', 'remembrance', 'commemorate',
      'commemoration', 'memorial', 'legacy',
    ],
    domains: ['psychology', 'fiction', 'emotions'],
  },
  {
    label: 'Dreams & Aspirations',
    signals: [
      'dream', 'dreams', 'dreamer', 'aspire', 'aspiration', 'ambition',
      'ambitious', 'goal', 'goals', 'hope', 'hopes', 'wish', 'wishes',
      'vision', 'visionary', 'desire', 'longing', 'yearning', 'aim',
      'objective', 'ideal', 'ideals',
    ],
    domains: ['self-help', 'psychology', 'inspiration'],
  },
  {
    label: 'Travel & Adventure',
    signals: [
      'travel', 'traveling', 'trip', 'journey', 'voyage', 'expedition',
      'adventure', 'adventurous', 'explore', 'exploration', 'explorer',
      'wander', 'wanderlust', 'tourist', 'tourism', 'backpack', 'road trip',
      'destination', 'landmark', 'sightseeing', 'nomad',
    ],
    domains: ['lifestyle', 'culture', 'personal'],
  },
  {
    label: 'Food & Cooking',
    signals: [
      'food', 'cook', 'cooking', 'recipe', 'chef', 'kitchen', 'cuisine',
      'meal', 'dinner', 'lunch', 'breakfast', 'bake', 'baking', 'grill',
      'ingredient', 'flavor', 'taste', 'delicious', 'dish', 'restaurant',
      'dining', 'nutrition', 'gourmet',
    ],
    domains: ['lifestyle', 'culture', 'health'],
  },
  {
    label: 'Sports & Athletics',
    signals: [
      'sport', 'sports', 'athlete', 'athletic', 'game', 'team', 'player',
      'coach', 'train', 'training', 'practice', 'competition', 'compete',
      'match', 'tournament', 'champion', 'championship', 'win', 'winning',
      'score', 'goal', 'fitness', 'exercise',
    ],
    domains: ['sports', 'health', 'lifestyle'],
  },
  {
    label: 'Fitness & Exercise',
    signals: [
      'fitness', 'exercise', 'workout', 'gym', 'run', 'running', 'jog',
      'swim', 'swimming', 'yoga', 'pilates', 'strength', 'cardio',
      'weight', 'lifting', 'muscle', 'flexible', 'flexibility', 'stretch',
      'endurance', 'marathon', 'personal trainer',
    ],
    domains: ['health', 'sports', 'lifestyle'],
  },
  {
    label: 'Nature & Outdoors',
    signals: [
      'outdoor', 'outdoors', 'hike', 'hiking', 'camp', 'camping', 'trail',
      'wilderness', 'backcountry', 'nature', 'natural', 'landscape',
      'scenic', 'scenery', 'park', 'garden', 'botanical', 'wildlife',
      'bird', 'birdwatching', 'fishing', 'kayak', 'canoe',
    ],
    domains: ['nature', 'lifestyle', 'travel'],
  },
  {
    label: 'Architecture & Design',
    signals: [
      'architecture', 'architect', 'architectural', 'design', 'designer',
      'building', 'structure', 'space', 'interior', 'urban', 'city',
      'skyline', 'modern', 'contemporary', 'minimalist', 'ornate',
      'facade', 'blueprint', 'construction', 'engineer', 'engineering',
    ],
    domains: ['art', 'technology', 'culture'],
  },
  {
    label: 'Time & Change',
    signals: [
      'time', 'temporal', 'change', 'changing', 'transient', 'temporary',
      'permanent', 'eternal', 'forever', 'moment', 'momentary', 'passing',
      'fading', 'aging', 'age', 'old', 'new', 'future', 'past', 'present',
      'transition', 'shift', 'era', 'generation',
    ],
    domains: ['philosophy', 'fiction', 'psychology'],
  },
  {
    label: 'Loneliness & Solitude',
    signals: [
      'lonely', 'loneliness', 'alone', 'solitude', 'isolated', 'isolation',
      'secluded', 'seclusion', 'solitary', 'desolate', 'desolation',
      'abandoned', 'abandonment', 'forsaken', 'disconnected', 'detached',
      'withdrawn', 'reclusive', 'hermit',
    ],
    domains: ['psychology', 'emotions', 'fiction'],
  },
  {
    label: 'Regret & Consequences',
    signals: [
      'regret', 'regretful', 'remorse', 'guilt', 'guilty', 'conscience',
      'consequence', 'consequences', 'result', 'outcome', 'repercussion',
      'ramification', 'cost', 'price', 'mistake', 'wrong', 'apologize',
      'apology', 'sorry', 'forgive', 'forgiveness', 'what if',
    ],
    domains: ['psychology', 'emotions', 'fiction'],
  },
  {
    label: 'Life & Existence',
    signals: [
      'life', 'living', 'alive', 'existence', 'exist', 'live', 'mortality',
      'mortal', 'mortal', 'birth', 'death', 'dying', 'cycle', 'journey',
      'path', 'experience', 'human', 'humanity', 'condition', 'mortal',
    ],
    domains: ['philosophy', 'spirituality', 'fiction'],
  },
  {
    label: 'Death & Mortality',
    signals: [
      'death', 'die', 'dying', 'dead', 'mortal', 'mortality', 'afterlife',
      'heaven', 'hell', 'funeral', 'grave', 'cemetery', 'loss', 'grief',
      'mourning', 'eulogy', 'legacy', 'memory', 'immortal', 'immortality',
      'terminal', 'fatal',
    ],
    domains: ['philosophy', 'spirituality', 'fiction'],
  },
  {
    label: 'Aging & Life Stages',
    signals: [
      'age', 'aging', 'ageing', 'old', 'elder', 'elderly', 'senior',
      'youth', 'young', 'child', 'childhood', 'adolescent', 'adolescence',
      'teenager', 'teen', 'adult', 'adulthood', 'middle age', 'midlife',
      'retire', 'retirement', 'generation',
    ],
    domains: ['psychology', 'health', 'society'],
  },
  {
    label: 'Technology & Digital Life',
    signals: [
      'smartphone', 'phone', 'mobile', 'screen', 'online', 'digital',
      'social media', 'instagram', 'twitter', 'facebook', 'tiktok',
      'internet', 'web', 'browser', 'email', 'text', 'message', 'notification',
      'app', 'gadget', 'device', 'laptop', 'tablet',
    ],
    domains: ['technology', 'lifestyle', 'society'],
  },
  {
    label: 'Productivity & Time Management',
    signals: [
      'productivity', 'productive', 'efficient', 'efficiency', 'effective',
      'effectiveness', 'organize', 'organization', 'plan', 'planning',
      'schedule', 'routine', 'habit', 'focus', 'concentrate', 'priority',
      'prioritize', 'deadline', 'time management', 'procastinate',
      'procrastination',
    ],
    domains: ['self-help', 'career', 'business'],
  },
  {
    label: 'Minimalism & Simplicity',
    signals: [
      'minimal', 'minimalism', 'minimalist', 'simple', 'simplicity',
      'simplify', 'declutter', 'clean', 'clear', 'essential', 'essentials',
      'less', 'enough', 'content', 'contentment', 'enough', 'uncluttered',
      'sparse', 'bare', 'fundamental',
    ],
    domains: ['lifestyle', 'philosophy', 'self-help'],
  },
  {
    label: 'Sustainability & Ethical Living',
    signals: [
      'sustainable', 'sustainability', 'ethical', 'conscious', 'eco-friendly',
      'green', 'organic', 'vegan', 'vegetarian', 'fair trade', 'cruelty-free',
      'zero waste', 'minimal', 'slow living', 'recycle', 'upcycle',
      'renewable', 'carbon footprint', 'compost',
    ],
    domains: ['environment', 'lifestyle', 'society'],
  },
  {
    label: 'Nature & Seasons',
    signals: [
      'spring', 'summer', 'autumn', 'fall', 'winter', 'season', 'seasonal',
      'bloom', 'blossom', 'harvest', 'leaf', 'leaves', 'snow', 'rain',
      'sun', 'sunset', 'sunrise', 'dawn', 'dusk', 'twilight', 'night',
      'moon', 'star', 'sky', 'cloud',
    ],
    domains: ['nature', 'fiction', 'poetry'],
  },
  {
    label: 'Home & Domestic Life',
    signals: [
      'home', 'house', 'apartment', 'room', 'garden', 'yard', 'living',
      'kitchen', 'bedroom', 'decor', 'decorate', 'furniture', 'move',
      'settle', 'neighbor', 'neighborhood', 'suburb', 'urban', 'rural',
      'domestic', 'household', 'chore',
    ],
    domains: ['lifestyle', 'relationships', 'fiction'],
  },
  {
    label: 'Parenthood & Family Life',
    signals: [
      'parent', 'parenting', 'mother', 'motherhood', 'father', 'fatherhood',
      'baby', 'infant', 'toddler', 'child', 'children', 'teen', 'teenager',
      'daughter', 'son', 'family', 'raise', 'raising', 'nurture', 'guardian',
      'maternal', 'paternal', 'grandparent',
    ],
    domains: ['relationships', 'lifestyle', 'psychology'],
  },
  {
    label: 'Marriage & Partnership',
    signals: [
      'marriage', 'marry', 'married', 'husband', 'wife', 'spouse', 'partner',
      'fiancé', 'fiancée', 'wedding', 'vow', 'ceremony', 'anniversary',
      'divorce', 'separate', 'separation', 'relationship', 'couple',
      'commitment', 'together', 'compromise',
    ],
    domains: ['relationships', 'psychology', 'lifestyle'],
  },
  {
    label: 'Dating & Romance',
    signals: [
      'date', 'dating', 'romance', 'romantic', 'single', 'singles',
      'boyfriend', 'girlfriend', 'crush', 'flirt', 'flirting', 'attraction',
      'attracted', 'chemistry', 'spark', 'match', 'compatible', 'compatibility',
      'dating app', 'tinder', 'relationship',
    ],
    domains: ['relationships', 'lifestyle', 'psychology'],
  },
  {
    label: 'Mindset & Perspective',
    signals: [
      'mindset', 'perspective', 'viewpoint', 'outlook', 'attitude',
      'thinking', 'thought', 'belief', 'mentality', 'paradigm', 'lens',
      'frame', 'interpretation', 'perception', 'see', 'view', 'understand',
      'gratitude', 'positive', 'optimism', 'optimistic', 'pessimistic',
    ],
    domains: ['self-help', 'psychology', 'philosophy'],
  },
  {
    label: 'Addiction & Recovery',
    signals: [
      'addiction', 'addict', 'addicted', 'substance', 'alcohol', 'drug',
      'drink', 'smoke', 'smoking', 'gambling', 'recovery', 'sober',
      'sobriety', 'rehab', 'rehabilitation', 'withdrawal', 'relapse',
      'twelve step', 'aa', 'na', 'counseling',
    ],
    domains: ['health', 'psychology', 'self-help'],
  },
  {
    label: 'Climate Change & Environment',
    signals: [
      'climate', 'climate change', 'global warming', 'greenhouse', 'carbon',
      'emission', 'fossil fuel', 'renewable', 'solar', 'wind', 'temperature',
      'rising', 'sea level', 'extreme weather', 'drought', 'flood',
      'wildfire', 'ice melt', 'glacier', 'activism', 'environmentalist',
    ],
    domains: ['environment', 'science', 'society'],
  },
  {
    label: 'Immigration & Displacement',
    signals: [
      'immigrant', 'immigration', 'migrant', 'migration', 'refugee',
      'asylum', 'exile', 'displaced', 'border', 'visa', 'deportation',
      'citizenship', 'naturalization', 'diaspora', 'expat', 'expatriate',
      'foreigner', 'alien', 'undocumented', 'sanctuary',
    ],
    domains: ['society', 'politics', 'culture'],
  },
  {
    label: 'Urban Life & City Living',
    signals: [
      'city', 'urban', 'downtown', 'neighborhood', 'borough', 'street',
      'apartment', 'condo', 'subway', 'commute', 'traffic', 'crowd',
      'noise', 'nightlife', 'restaurant', 'cafe', 'park', 'sidewalk',
      'skyscraper', 'gentrification', 'metropolitan',
    ],
    domains: ['lifestyle', 'culture', 'society'],
  },
  {
    label: 'Rural Life & Farming',
    signals: [
      'rural', 'farm', 'farmer', 'farming', 'agriculture', 'agricultural',
      'countryside', 'village', 'field', 'crop', 'livestock', 'harvest',
      'ranch', 'barn', 'tractor', 'soil', 'grow', 'plant', 'orchard',
      'pasture', 'homestead',
    ],
    domains: ['lifestyle', 'nature', 'culture'],
  },
  {
    label: 'Poverty & Economic Inequality',
    signals: [
      'poverty', 'poor', 'impoverished', 'homeless', 'homelessness',
      'inequality', 'wealth gap', 'economic', 'hardship', 'hunger',
      'starvation', 'aid', 'charity', 'welfare', 'social safety net',
      'food insecurity', 'low income', 'working class', 'underprivileged',
    ],
    domains: ['society', 'politics', 'economics'],
  },
  {
    label: 'Colonialism & Post-Colonialism',
    signals: [
      'colony', 'colonial', 'colonialism', 'colonizer', 'colonized',
      'imperial', 'imperialism', 'empire', 'decolonize', 'decolonization',
      'postcolonial', 'independence', 'liberation', 'settler', 'indigenous',
      'native', 'occupation', 'resistance',
    ],
    domains: ['history', 'politics', 'culture'],
  },
  {
    label: 'Mythology & Folklore',
    signals: [
      'myth', 'mythology', 'mythological', 'legend', 'legendary', 'folklore',
      'fairy tale', 'fable', 'folktale', 'mythic', 'epic', 'gods', 'goddess',
      'hero', 'heroic', 'creature', 'monster', 'magic', 'supernatural',
      'ancient', 'tale',
    ],
    domains: ['culture', 'fiction', 'history'],
  },
  {
    label: 'Supernatural & Fantasy',
    signals: [
      'supernatural', 'paranormal', 'ghost', 'spirit', 'haunted', 'haunting',
      'magic', 'magical', 'witch', 'wizard', 'sorcery', 'spell', 'curse',
      'demon', 'angel', 'vampire', 'werewolf', 'zombie', 'otherworldly',
      'mystical', 'occult',
    ],
    domains: ['fiction', 'entertainment', 'culture'],
  },
  {
    label: 'Science Fiction & Futurism',
    signals: [
      'science fiction', 'sci-fi', 'futuristic', 'future', 'dystopia',
      'dystopian', 'utopia', 'utopian', 'space', 'starship', 'alien',
      'extraterrestrial', 'cyborg', 'android', 'robot', 'virtual reality',
      'augmented', 'cyberpunk', 'time travel', 'parallel universe',
      'galaxy', 'interstellar',
    ],
    domains: ['fiction', 'technology', 'culture'],
  },
  {
    label: 'Mystery & Detective',
    signals: [
      'mystery', 'mysterious', 'detective', 'investigate', 'investigation',
      'suspect', 'clue', 'evidence', 'crime', 'criminal', 'murder',
      'victim', 'alibi', 'motive', 'sleuth', 'solve', 'case', 'detective',
      'police', 'inspector', 'whodunit',
    ],
    domains: ['fiction', 'entertainment', 'culture'],
  },
  {
    label: 'Suspense & Thriller',
    signals: [
      'suspense', 'suspenseful', 'thriller', 'chilling', 'gripping',
      'edge-of-your-seat', 'page-turner', 'twist', 'unexpected', 'tense',
      'tension', 'urgent', 'racing', 'breathless', 'hunting', 'chase',
      'escape', 'danger', 'peril', 'survival',
    ],
    domains: ['fiction', 'entertainment', 'culture'],
  },
  {
    label: 'Tragedy & Suffering',
    signals: [
      'tragedy', 'tragic', 'suffer', 'suffering', 'anguish', 'torment',
      'agony', 'misery', 'woe', 'calamity', 'catastrophe', 'disaster',
      'devastation', 'ruin', 'ruined', 'destruction', 'destroy', 'lost',
      'hopeless', 'despair', 'desperate',
    ],
    domains: ['fiction', 'emotions', 'philosophy'],
  },
  {
    label: 'Hope & Optimism',
    signals: [
      'hope', 'hopeful', 'optimism', 'optimistic', 'positive', 'bright',
      'future', 'better', 'possibility', 'possible', 'silver lining',
      'light', 'dawn', 'renewal', 'rebirth', 'second chance', 'fresh start',
      'believe', 'encouraging', 'encouragement',
    ],
    domains: ['self-help', 'spirituality', 'inspiration'],
  },
  {
    label: 'Struggle & Adversity',
    signals: [
      'struggle', 'struggling', 'adversity', 'hardship', 'difficult',
      'difficulty', 'challenge', 'challenging', 'obstacle', 'barrier',
      'trial', 'tribulation', 'ordeal', 'hardship', 'hard', 'tough',
      'fight', 'battle', 'resist', 'resistance',
    ],
    domains: ['self-help', 'psychology', 'fiction'],
  },
  {
    label: 'Transformation & Change',
    signals: [
      'transform', 'transformation', 'change', 'changing', 'shift',
      'transition', 'metamorphosis', 'evolve', 'evolution', 'convert',
      'conversion', 'turn', 'become', 'new', 'rebirth', 'renew', 'renewal',
      'reinvent', 'reinvention', 'makeover', 'remake',
    ],
    domains: ['self-help', 'psychology', 'fiction'],
  },
  {
    label: 'Freedom & Liberation',
    signals: [
      'freedom', 'free', 'liberate', 'liberation', 'emancipate', 'emancipation',
      'release', 'unbound', 'unshackle', 'break free', 'escape', 'autonomy',
      'independent', 'independence', 'self-determination', 'sovereignty',
      'liberty',
    ],
    domains: ['philosophy', 'politics', 'self-help'],
  },
  {
    label: 'Law & Legal System',
    signals: [
      'law', 'legal', 'lawyer', 'attorney', 'judge', 'court', 'trial',
      'case', 'lawsuit', 'litigation', 'verdict', 'sentence', 'appeal',
      'constitution', 'constitutional', 'statute', 'regulation', 'comply',
      'compliance', 'enforce', 'enforcement',
    ],
    domains: ['society', 'politics', 'career'],
  },
  {
    label: 'Philosophy & Ethics',
    signals: [
      'philosophy', 'philosophical', 'ethics', 'ethical', 'morality',
      'moral', 'dilemma', 'ethical dilemma', 'right', 'wrong', 'good',
      'evil', 'virtue', 'vice', 'utilitarian', 'deontology',
      'consequentialism', 'justice', 'fairness',
    ],
    domains: ['philosophy', 'academic', 'society'],
  },
  {
    label: 'Religion & Theology',
    signals: [
      'religion', 'religious', 'theology', 'theological', 'divine',
      'sacred', 'holy', 'god', 'allah', 'jesus', 'buddha', 'scripture',
      'bible', 'quran', 'torah', 'prayer', 'worship', 'faith', 'belief',
      'church', 'temple', 'mosque', 'monastery',
    ],
    domains: ['spirituality', 'culture', 'history'],
  },
  {
    label: 'Gaming & Video Games',
    signals: [
      'game', 'gaming', 'video game', 'console', 'pc', 'player', 'play',
      'multiplayer', 'single-player', 'rpg', 'fps', 'strategy', 'puzzle',
      'level', 'boss', 'quest', 'achievement', 'esports', 'streamer',
      'twitch', 'steam',
    ],
    domains: ['entertainment', 'technology', 'culture'],
  },
  {
    label: 'Film & Cinema',
    signals: [
      'film', 'movie', 'cinema', 'cinematic', 'director', 'actor', 'actress',
      'screenplay', 'script', 'scene', 'shot', 'edit', 'editing',
      'soundtrack', 'score', 'genre', 'documentary', 'feature', 'short',
      'animation', 'hollywood', 'indie',
    ],
    domains: ['entertainment', 'art', 'culture'],
  },
  {
    label: 'Television & Streaming',
    signals: [
      'tv', 'television', 'show', 'series', 'episode', 'season', 'netflix',
      'hulu', 'disney+', 'hbo', 'stream', 'streaming', 'binge', 'watch',
      'viewer', 'audience', 'premiere', 'finale', 'reality', 'sitcom',
      'drama',
    ],
    domains: ['entertainment', 'culture', 'lifestyle'],
  },
  {
    label: 'Social Media & Internet Culture',
    signals: [
      'social media', 'instagram', 'tiktok', 'twitter', 'facebook',
      'youtube', 'influencer', 'viral', 'meme', 'hashtag', 'trending',
      'like', 'follow', 'follower', 'subscribe', 'post', 'content',
      'algorithm', 'feed', 'story', 'reel',
    ],
    domains: ['technology', 'society', 'culture'],
  },
  {
    label: 'Journalism & Media',
    signals: [
      'journalism', 'journalist', 'news', 'reporter', 'report', 'article',
      'headline', 'press', 'media', 'broadcast', 'interview', 'editor',
      'editorial', 'column', 'opinion', 'investigative', 'source',
      'coverage', 'fake news', 'misinformation',
    ],
    domains: ['society', 'culture', 'politics'],
  },
  {
    label: 'Biography & Memoir',
    signals: [
      'biography', 'biographical', 'memoir', 'autobiography', 'life story',
      'personal account', 'reminiscence', 'recollection', 'life', 'lived',
      'experience', 'journey', 'remember', 'story', 'tale', 'narrative',
      'chronicle', 'portrait',
    ],
    domains: ['literature', 'culture', 'history'],
  },
  {
    label: 'Relationships & Connection',
    signals: [
      'relationship', 'relationships', 'connection', 'connect', 'bond',
      'together', 'closeness', 'intimate', 'intimacy', 'attachment',
      'interpersonal', 'relate', 'relating', 'mutual', 'reciprocal',
      'understanding', 'rapport', 'chemistry', 'trust',
    ],
    domains: ['relationships', 'psychology', 'self-help'],
  },
  {
    label: 'Conflict & Resolution',
    signals: [
      'conflict', 'conflicting', 'disagreement', 'dispute', 'quarrel',
      'argument', 'fight', 'clash', 'struggle', 'tension', 'oppose',
      'opposition', 'resolve', 'resolution', 'settle', 'mediation',
      'compromise', 'forgive', 'reconcile', 'reconciliation',
    ],
    domains: ['relationships', 'psychology', 'society'],
  },
  {
    label: 'Betrayal & Trust',
    signals: [
      'betray', 'betrayal', 'betrayed', 'traitor', 'treachery', 'deceive',
      'deception', 'deceit', 'dishonest', 'dishonesty', 'lie', 'lying',
      'false', 'unfaithful', 'infidelity', 'cheat', 'cheating', 'broken trust',
      'mistrust', 'suspicion',
    ],
    domains: ['relationships', 'psychology', 'fiction'],
  },
  {
    label: 'Apology & Forgiveness',
    signals: [
      'apologize', 'apology', 'sorry', 'forgive', 'forgiveness', 'forgiven',
      'pardon', 'absolve', 'redemption', 'redeem', 'making amends',
      'make up', 'atonement', 'penitence', 'repent', 'repentance',
      'reconcile', 'reconciliation', 'move on',
    ],
    domains: ['relationships', 'psychology', 'spirituality'],
  },
  {
    label: 'Gratitude & Appreciation',
    signals: [
      'grateful', 'gratitude', 'thankful', 'thankfulness', 'appreciate',
      'appreciation', 'blessed', 'blessing', 'indebted', 'acknowledge',
      'recognition', 'value', 'cherish', 'treasure', 'count your blessings',
    ],
    domains: ['self-help', 'psychology', 'spirituality'],
  },
  {
    label: 'Self-Discovery & Identity',
    signals: [
      'self-discovery', 'identity', 'identity', 'who am i', 'finding oneself',
      'true self', 'authentic self', 'self-exploration', 'journey within',
      'inner self', 'discover', 'find yourself', 'self-knowledge',
      'self-understanding', 'personal identity', 'sense of self',
    ],
    domains: ['self-help', 'psychology', 'philosophy'],
  },
  {
    label: 'Letting Go & Acceptance',
    signals: [
      'let go', 'letting go', 'release', 'surrender', 'accept', 'acceptance',
      'accepting', 'move on', 'moving on', 'closure', 'peace', 'forgive',
      'forgiveness', 'release', 'detach', 'detachment', 'non-attachment',
    ],
    domains: ['self-help', 'psychology', 'spirituality'],
  },
  {
    label: 'Patience & Waiting',
    signals: [
      'patience', 'patient', 'impatient', 'wait', 'waiting', 'endure',
      'endurance', 'tolerance', 'forbearance', 'perseverance', 'calm',
      'composure', 'restraint', 'delay', 'postpone', 'defer',
    ],
    domains: ['self-help', 'psychology', 'philosophy'],
  },
  {
    label: 'Sacrifice & Selflessness',
    signals: [
      'sacrifice', 'sacrificial', 'selfless', 'selflessness', 'give up',
      'give', 'giving', 'altruism', 'altruistic', 'generous', 'generosity',
      'charity', 'charitable', 'service', 'serve', 'devote', 'devotion',
      'dedicate', 'dedication',
    ],
    domains: ['philosophy', 'spirituality', 'relationships'],
  },
  {
    label: 'Jealousy & Envy',
    signals: [
      'jealous', 'jealousy', 'envy', 'envious', 'covet', 'covetous',
      'resent', 'resentment', 'bitter', 'bitterness', 'green-eyed',
      'possessive', 'insecure', 'inferiority', 'comparison',
    ],
    domains: ['psychology', 'emotions', 'relationships'],
  },
  {
    label: 'Anger & Rage',
    signals: [
      'anger', 'angry', 'rage', 'fury', 'furious', 'wrath', 'irate',
      'irritated', 'irritation', 'annoyed', 'annoyance', 'frustrate',
      'frustration', 'outrage', 'outraged', 'temper', 'hostile', 'hostility',
    ],
    domains: ['psychology', 'emotions', 'relationships'],
  },
  {
    label: 'Shame & Guilt',
    signals: [
      'shame', 'ashamed', 'shameful', 'guilt', 'guilty', 'remorse',
      'remorseful', 'contrite', 'contrition', 'embarrass', 'embarrassed',
      'embarrassment', 'humiliate', 'humiliation', 'mortified', 'disgrace',
      'disgraced', 'regret', 'regretful',
    ],
    domains: ['psychology', 'emotions', 'fiction'],
  },
  {
    label: 'Pride & Arrogance',
    signals: [
      'pride', 'proud', 'arrogant', 'arrogance', 'conceited', 'vanity',
      'vain', 'egotistical', 'ego', 'hubris', 'haughty', 'smug',
      'self-important', 'superior', 'narcissism', 'narcissistic',
    ],
    domains: ['psychology', 'emotions', 'fiction'],
  },
  {
    label: 'Power & Control',
    signals: [
      'power', 'powerful', 'control', 'dominate', 'domination', 'authority',
      'influence', 'manipulate', 'manipulation', 'coerce', 'coercion',
      'force', 'command', 'rule', 'govern', 'master', 'subjugate',
      'oppress', 'oppression', 'tyranny',
    ],
    domains: ['politics', 'society', 'psychology'],
  },
  {
    label: 'Resistance & Rebellion',
    signals: [
      'resist', 'resistance', 'rebel', 'rebellion', 'revolt', 'uprising',
      'revolution', 'revolutionary', 'insurgent', 'insurrection', 'defy',
      'defiance', 'protest', 'defiant', 'oppose', 'opposition', 'dissident',
      'underground', 'civil disobedience',
    ],
    domains: ['politics', 'history', 'society'],
  },
  {
    label: 'Diplomacy & Negotiation',
    signals: [
      'diplomacy', 'diplomatic', 'diplomat', 'negotiate', 'negotiation',
      'negotiate', 'bargain', 'bargaining', 'compromise', 'deal', 'agree',
      'agreement', 'treaty', 'accord', 'mediation', 'mediate', 'arbitrate',
      'arbitration', 'consensus',
    ],
    domains: ['politics', 'business', 'relationships'],
  },
];

export function scoreTopics(text) {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter(w => w.length >= 3);
  const wordSet = new Set(words);
  const sentences = lower.split(/[.!?\n\r]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;

  const scored = [];

  for (const topic of TOPICS) {
    let signalHits = 0;
    let sentenceHits = 0;
    let multiWordHits = 0;

    for (const signal of topic.signals) {
      if (signal.includes(' ')) {
        if (lower.includes(signal)) {
          multiWordHits += signal.split(' ').length;
          signalHits += 2;
        }
      } else if (wordSet.has(signal)) {
        signalHits += 1;
      }
    }

    if (signalHits === 0) continue;

    for (const sentence of sentences) {
      const hasSignal = topic.signals.some(signal =>
        signal.includes(' ') ? sentence.includes(signal) : sentence.split(/\W+/).includes(signal)
      );
      if (hasSignal) sentenceHits++;
    }

    const sentenceRatio = sentenceCount > 0 ? sentenceHits / sentenceCount : 0;
    let score = signalHits * 2.5;
    score += sentenceHits * 3;
    score += multiWordHits * 2;
    if (sentenceRatio >= 0.5) score += 5;
    if (sentenceRatio >= 0.75) score += 3;

    const totalWords = topic.signals.length;
    const coverage = signalHits / totalWords;
    score += coverage * 10;

    scored.push({ label: topic.label, score, topic });
  }

  scored.sort((a, b) => b.score - a.score);

  const maxTags = scored.length >= 50 ? Math.min(scored.length, 30)
    : scored.length >= 20 ? 12
    : scored.length >= 8 ? 8
    : scored.length >= 3 ? 5
    : scored.length;

  const threshold = scored.length > 0 ? Math.max(scored[0].score * 0.3, 3) : 0;
  const result = [];

  for (const { label, score } of scored) {
    if (result.length >= maxTags) break;
    if (score < threshold) break;
    if (result.includes(label)) continue;
    result.push(label);
  }

  return result.slice(0, 10);
}