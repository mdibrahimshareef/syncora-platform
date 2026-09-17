-- Create an RPC for matching embeddings
CREATE OR REPLACE FUNCTION match_embeddings (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_workspace_id uuid
)
RETURNS TABLE (
  id uuid,
  resource_type text,
  resource_id uuid,
  content_text text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ai_embeddings.id,
    ai_embeddings.resource_type,
    ai_embeddings.resource_id,
    ai_embeddings.content_text,
    1 - (ai_embeddings.embedding <=> query_embedding) AS similarity
  FROM ai_embeddings
  WHERE ai_embeddings.workspace_id = p_workspace_id
    AND 1 - (ai_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY ai_embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;
