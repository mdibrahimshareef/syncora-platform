import React from 'react'

export interface AISource {
  id: string
  title: string
  type: string
  url?: string
}

export interface AISourceListProps {
  sources: AISource[]
}

export function AISourceList({ sources }: AISourceListProps) {
  if (!sources || sources.length === 0) return null

  // Double check deduplication natively to be safe
  const uniqueSources = sources.filter((source, idx, arr) => 
    arr.findIndex(s => s.id === source.id) === idx
  )

  // Cap to 5 to avoid overwhelming the user
  const displaySources = uniqueSources.slice(0, 5)

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sources</p>
      <div className="flex flex-wrap gap-2">
        {displaySources.map((source, i) => (
          <div key={`${source.id}-${i}`} className="flex flex-col gap-0.5 border border-border/60 rounded-md p-2 bg-background hover:bg-muted/50 transition-colors w-full sm:w-[220px]">
            <span className="font-semibold text-xs text-foreground truncate" title={source.title}>{source.title}</span>
            <span className="text-[10px] text-muted-foreground capitalize">{source.type.replace(/_/g, ' ')}</span>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-600 mt-1 text-[10px] flex items-center gap-1 group w-fit">
                Open {source.type.replace(/_/g, ' ')} <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </a>
            ) : (
              <span className="text-muted-foreground mt-1 text-[10px] italic">Internal record</span>
            )}
          </div>
        ))}
        {uniqueSources.length > 5 && (
          <div className="flex items-center justify-center border border-border/60 border-dashed rounded-md p-2 bg-muted/20 w-full sm:w-[100px]">
            <span className="text-[10px] text-muted-foreground">+{uniqueSources.length - 5} more</span>
          </div>
        )}
      </div>
    </div>
  )
}
