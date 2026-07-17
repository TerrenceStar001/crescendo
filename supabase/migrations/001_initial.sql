CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  url TEXT,
  content TEXT,
  summary TEXT,
  published_at TIMESTAMPTZ,
  crawled_at TIMESTAMPTZ DEFAULT NOW(),
  difficulty TEXT DEFAULT 'intermediate',
  topics TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(384)
);

CREATE TABLE IF NOT EXISTS papers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reading', 'writing', 'listening', 'speaking')),
  year INTEGER,
  month TEXT,
  level TEXT DEFAULT 'dse',
  content JSONB DEFAULT '{}',
  questions JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcast_channels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  feed_url TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  language TEXT DEFAULT 'en',
  category TEXT,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcasts (
  id TEXT PRIMARY KEY,
  channel_id TEXT REFERENCES podcast_channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,
  transcript TEXT,
  duration_seconds INTEGER,
  published_at TIMESTAMPTZ,
  difficulty TEXT DEFAULT 'intermediate',
  topics TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  skill TEXT NOT NULL CHECK (skill IN ('reading', 'writing', 'listening', 'speaking')),
  level TEXT NOT NULL DEFAULT 'intermediate',
  topics TEXT[] DEFAULT '{}',
  lesson_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  lesson_type TEXT DEFAULT 'lesson',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('article', 'podcast', 'course')),
  source_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(384),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_type, source_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS crawl_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  items_found INTEGER DEFAULT 0,
  items_inserted INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_type ON papers(type);
CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year DESC);
CREATE INDEX IF NOT EXISTS idx_podcasts_channel ON podcasts(channel_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_published ON podcasts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_courses_skill ON courses(skill);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_crawl_log_source ON crawl_log(source);
CREATE INDEX IF NOT EXISTS idx_crawl_log_status ON crawl_log(status);

INSERT INTO articles (id, title, source, content, difficulty, topics) VALUES
('bundled-001', 'The Rise of Renewable Energy', 'bundled', 'Renewable energy has become one of the most important topics in the modern world. As concerns about climate change continue to grow, countries around the globe are increasingly turning to renewable sources such as solar, wind, and hydroelectric power. These energy sources offer a cleaner alternative to fossil fuels, which have been the dominant source of energy for centuries. One of the key advantages of renewable energy is that it produces little to no greenhouse gas emissions. This makes it an essential part of efforts to reduce the impact of global warming. Additionally, renewable energy sources are abundant and can be harnessed in most parts of the world. However, there are also challenges associated with renewable energy. One of the main issues is that the production of energy from renewable sources can be inconsistent. For example, solar panels only generate electricity when the sun is shining, and wind turbines require a certain amount of wind to operate effectively. Despite these challenges, the renewable energy sector has been growing rapidly. Technological advancements have made renewable energy more efficient and cost-effective than ever before. Many experts believe that renewable energy will eventually become the primary source of energy for the world.', 'intermediate', ARRAY['environment', 'energy', 'technology']),
('bundled-002', 'The Power of Social Media', 'bundled', 'Social media has transformed the way people communicate and interact with each other. Platforms like Facebook, Instagram, and Twitter have billions of active users worldwide. These platforms allow people to share their thoughts, photos, and experiences with a global audience. One of the most significant impacts of social media is that it has democratized information. Anyone with an internet connection can now share their views and reach a large audience. This has given a voice to people who might not have been heard otherwise. Social media has also become an important tool for businesses. Companies use social media to promote their products, engage with customers, and build their brand. Influencers on social media can have a major impact on consumer behaviour. However, social media also has its drawbacks. One concern is the spread of misinformation. False information can spread quickly on social media, sometimes with serious consequences. There are also concerns about privacy and the amount of personal data that social media platforms collect. Despite these issues, social media continues to play an increasingly important role in modern society.', 'intermediate', ARRAY['technology', 'society', 'communication']),
('bundled-003', 'Hong Kong''s Public Transport System', 'bundled', 'Hong Kong has one of the most efficient and comprehensive public transport systems in the world. The system includes the MTR (Mass Transit Railway), buses, minibuses, trams, ferries, and taxis. Together, these form a network that allows millions of people to travel across the city every day. The MTR is the backbone of Hong Kong''s public transport system. It is known for being clean, reliable, and punctual. The MTR network covers most parts of Hong Kong, including Hong Kong Island, Kowloon, and the New Territories. In addition to the MTR, buses play an important role in connecting areas that are not served by the railway. Hong Kong''s public transport system is also notable for its affordability. Compared to many other major cities, the cost of public transport in Hong Kong is relatively low. This encourages more people to use public transport rather than private cars, which helps to reduce traffic congestion and air pollution. The efficiency of Hong Kong''s public transport system is often cited as one of the reasons why the city is able to function so effectively despite its high population density.', 'intermediate', ARRAY['hong-kong', 'transport', 'society']),
('bundled-004', 'The Importance of Learning a Second Language', 'bundled', 'In today''s globalized world, the ability to speak more than one language has become increasingly valuable. Learning a second language offers numerous benefits, both practical and cognitive. From a practical standpoint, being bilingual can open up more job opportunities. Many employers value employees who can communicate with clients and colleagues in different languages. In fields such as international business, tourism, and diplomacy, knowing a second language is often essential. Learning a second language also has cognitive benefits. Studies have shown that bilingual individuals tend to have better problem-solving skills, improved memory, and greater mental flexibility. Learning a new language can also delay the onset of age-related cognitive decline. Despite these benefits, learning a second language can be challenging. It requires time, effort, and consistent practice. However, with the right approach and resources, most people can achieve a reasonable level of proficiency. Language learning apps, online courses, and language exchange programmes have made it easier than ever to learn a new language.', 'intermediate', ARRAY['education', 'language', 'career']),
('bundled-005', 'Climate Change and Its Effects', 'bundled', 'Climate change is one of the most pressing issues facing the world today. Scientists agree that the Earth''s climate is changing at an unprecedented rate, primarily due to human activities such as the burning of fossil fuels and deforestation. These activities release large amounts of greenhouse gases into the atmosphere, which trap heat and cause the planet to warm. The effects of climate change are already being felt around the world. Rising global temperatures have led to more frequent and severe heatwaves, droughts, and wildfires. Melting polar ice caps and glaciers are causing sea levels to rise, which threatens coastal communities. Changes in weather patterns are also affecting agriculture, with some regions experiencing more intense rainfall and flooding while others face prolonged droughts. Addressing climate change requires action at both the individual and governmental levels. Individuals can reduce their carbon footprint by using less energy, choosing renewable energy sources, and adopting sustainable consumption habits. Governments can implement policies to reduce emissions, invest in renewable energy, and protect natural ecosystems. International cooperation is also essential, as climate change is a global problem that requires a coordinated global response.', 'advanced', ARRAY['environment', 'climate', 'global-issues'])
ON CONFLICT (id) DO NOTHING;
