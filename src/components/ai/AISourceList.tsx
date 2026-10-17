import React from 'react'
import { CheckSquare, Folders, FileText, ExternalLink, Database } from 'lucide-react'

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

  // Deduplicate sources by id
  const uniqueSources = sources.filter((source, idx, arr) => 
    arr.findIndex(s => s.id === source.id) === idx
  )

  const displaySources = uniqueSources.slice(0, 6)

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'task': return <CheckSquare className="size-3 text-emerald-500" />
      case 'project': return <Folders className="size-3 text-indigo-500" />
      case 'document': return <FileText className="size-3 text-amber-500" />
      default: return <Database className="size-3 text-blue-500" />
    }
  }

  return (
    <div className="mt-3.5 pt-3 border-t border-border/50">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Authoritative Sources ({uniqueSources.length})</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displaySources.map((source, i) => (
          <div 
            key={`${source.id}-${i}`} 
            className="flex items-center justify-between p-2 rounded-lg border border-border/70 bg-card/60 backdrop-blur-xs hover:bg-accent/40 hover:border-border transition-all group"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <div className="size-6 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
                {getSourceIcon(source.type)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate" title={source.title}>
                  {source.title}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {source.type.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
            
            {source.url ? (
              <a 
                href={source.url} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xs text-muted-foreground hover:text-indigo-500 p-1 rounded-md hover:bg-muted/60 transition-colors shrink-0"
                title={`Open ${source.title}`}
              >
                <ExternalLink className="size-3.5" />
              </a>
            ) : (
              <span className="text-[10px] text-muted-foreground italic shrink-0">db</span>
            )}
          </div>
        ))}
        {uniqueSources.length > 6 && (
          <div className="flex items-center justify-center border border-border/60 border-dashed rounded-lg p-2 bg-muted/20 text-xs text-muted-foreground col-span-full">
            +{uniqueSources.length - 6} additional workspace sources referenced
          </div>
        )}
      </div>
    </div>
  )
}
