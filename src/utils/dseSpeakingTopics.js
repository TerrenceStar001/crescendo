const TOPICS = {
  education: ['Examinations', 'Online Learning', 'Study Abroad', 'School Uniform', 'Homework', 'University Education', 'Vocational Training', 'Lifelong Learning'],
  technology: ['Artificial Intelligence', 'Social Media', 'Smartphones in Schools', 'Gaming', 'Internet Privacy', 'Digital Divide', 'Automation', 'Remote Work'],
  environment: ['Climate Change', 'Air Pollution', 'Recycling', 'Conservation', 'Renewable Energy', 'Plastic Waste', 'Urban Green Spaces', 'Sustainable Living'],
  society: ['Hong Kong Identity', 'Tradition vs Modernity', 'Multiculturalism', 'Volunteering', 'Gender Equality', 'Aging Population', 'Public Transport', 'Urban Development'],
  health: ['Exercise', 'Mental Health', 'Healthy Diet', 'Healthcare System', 'Sleep', 'Stress Management', 'Sports', 'Public Health'],
  economy: ['Money Management', 'Career Planning', 'Entrepreneurship', 'Consumerism', 'Minimum Wage', 'Gig Economy', 'Tourism', 'Globalisation'],
  culture: ['Art', 'Music', 'Movies', 'Reading', 'Travel', 'Festivals', 'Cultural Heritage', 'Food Culture'],
  personal: ['Friendship', 'Family', 'Ambition', 'Role Models', 'Communication', 'Time Management', 'Social Media Friends', 'Peer Pressure'],
};

const TOPIC_QUESTIONS = {
  'Artificial Intelligence': { group: 'technology' },
  'Climate Change': { group: 'environment' },
  'Social Media': { group: 'technology' },
};

export function getTopics() {
  return TOPICS;
}

export function getTopicList() {
  return Object.values(TOPICS).flat();
}

export function getTopicGroups() {
  return Object.entries(TOPICS);
}

export function generateSpeakingPrompt(topic) {
  const meta = TOPIC_QUESTIONS[topic];
  return {
    topic,
    group: meta?.group || 'general',
    prompt: `"${topic}"\n\nDiscuss the impact and importance of ${topic.toLowerCase()} in modern society.\nYou have 1 minute to prepare and 1 minute to speak.\n\nConsider:\n- What is ${topic.toLowerCase()} and why does it matter?\n- How does it affect people's daily lives?\n- What are the benefits and challenges?\n- What is your personal opinion or experience?\n\nStructure your answer with a clear introduction, main points, and conclusion.`,
  };
}
