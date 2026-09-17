DROP FUNCTION IF EXISTS match_embeddings;

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
  similarity float,
  title text,
  metadata jsonb
)
LANGUAGE sql STABLE
AS $$
  SELECT
    e.id,
    e.resource_type,
    e.resource_id,
    e.content_text,
    1 - (e.embedding <=> query_embedding) AS similarity,
    COALESCE(p.name, t.title, d.title, 'Unknown Resource') AS title,
    jsonb_build_object(
      'project_id', t.project_id
    ) AS metadata
  FROM ai_embeddings e
  LEFT JOIN projects p ON e.resource_type = 'project' AND e.resource_id = p.id
  LEFT JOIN tasks t ON e.resource_type = 'task' AND e.resource_id = t.id
  LEFT JOIN documents d ON e.resource_type = 'document' AND e.resource_id = d.id
  WHERE e.workspace_id = p_workspace_id
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

