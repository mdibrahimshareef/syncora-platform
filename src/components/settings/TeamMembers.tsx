"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function TeamMembers({ teamId }: { teamId?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>Manage your team members and their roles.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          Team member management will be available in a future update.
        </div>
      </CardContent>
    </Card>
  )
}
