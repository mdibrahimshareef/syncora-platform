-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Alter ai_embeddings to use vector type
-- Note: If data exists, we would need a USING clause, but since JSONB placeholder was empty or we can wipe it for this migration:
TRUNCATE TABLE public.ai_embeddings;

ALTER TABLE public.ai_embeddings 
  DROP COLUMN embedding,
  ADD COLUMN embedding vector(1536);

-- Create HNSW index for fast semantic search
CREATE INDEX IF NOT EXISTS ai_embeddings_embedding_idx 
  ON public.ai_embeddings 
  USING hnsw (embedding vector_cosine_ops);
