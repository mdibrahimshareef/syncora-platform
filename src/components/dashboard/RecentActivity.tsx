import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function RecentActivity() {
  const activity = useDataStore(s => s.activity);
  
  return (
    <Card className="col-span-1 border-border">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {activity.slice(0, 5).map(activity => (
            <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{activity.user.initials}</AvatarFallback>
                </Avatar>
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-medium text-sm text-foreground">{activity.user.name}</div>
                  <time className="text-xs font-mono text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                <div className="text-xs text-muted-foreground">
                  {activity.action} <span className="font-medium text-foreground">{activity.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
