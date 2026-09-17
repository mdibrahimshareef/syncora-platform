"use client"

import * as React from "react"
import { useDataStore } from "@/stores/data-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Globe, Lock, Loader2 } from "lucide-react"

const VisibilitySelect = ({ name, value, onChange }: { name: string, value: string, onChange: (name: string, value: string) => void }) => (
  <Select value={value} onValueChange={(val) => val && onChange(name, val)}>
    <SelectTrigger className="w-[140px] h-9">
      <SelectValue placeholder="Visibility" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="anyone">
        <div className="flex items-center">
          <Globe className="mr-2 size-4 text-muted-foreground" />
          <span>Anyone</span>
        </div>
      </SelectItem>
      <SelectItem value="only_you">
        <div className="flex items-center">
          <Lock className="mr-2 size-4 text-muted-foreground" />
          <span>Only you</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
)

const ProfileField = ({ 
  id, 
  label, 
  placeholder, 
  value, 
  onChange,
  visName,
  visValue,
  onVisChange,
  type = "text" 
}: { 
  id: string, 
  label: string, 
  placeholder: string, 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void,
  visName: string,
  visValue: string,
  onVisChange: (name: string, value: string) => void,
  type?: string 
}) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-4 py-4 border-b border-border/40 last:border-0">
    <div className="sm:w-1/3 pt-1">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
    </div>
    <div className="sm:w-2/3 flex flex-col sm:flex-row gap-3 items-start">
      <div className="w-full flex-1">
        <Input 
          id={id} 
          name={id}
          type={type} 
          placeholder={placeholder} 
          value={value} 
          onChange={onChange}
        />
      </div>
      <VisibilitySelect name={visName} value={visValue} onChange={onVisChange} />
    </div>
  </div>
)

export default function AccountSettingsPage() {
  const currentUser = useDataStore(s => s.currentUser);
  const updateCurrentUser = useDataStore(s => s.updateCurrentUser);
  
  const [isSaving, setIsSaving] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  // Initialize form state from currentUser and metadata
  const meta = currentUser?.metadata || {}
  
  const [formData, setFormData] = React.useState({
    fullName: currentUser?.name || "",
    publicName: meta.publicName || (currentUser?.name?.split(" ")[0] || ""),
    pronouns: meta.pronouns || "",
    jobTitle: meta.jobTitle || "",
    department: meta.department || "",
    organization: meta.organization || "",
    basedIn: meta.basedIn || "",
    localTime: meta.localTime || "",
    contact: meta.contact || currentUser?.email || "",
    workingWithMe: meta.workingWithMe || "",
  })

  const [visibility, setVisibility] = React.useState({
    fullNameVis: meta.fullNameVis || "anyone",
    publicNameVis: meta.publicNameVis || "anyone",
    pronounsVis: meta.pronounsVis || "anyone",
    jobTitleVis: meta.jobTitleVis || "anyone",
    departmentVis: meta.departmentVis || "anyone",
    organizationVis: meta.organizationVis || "anyone",
    basedInVis: meta.basedInVis || "anyone",
    localTimeVis: meta.localTimeVis || "anyone",
    contactVis: meta.contactVis || "only_you",
    workingWithMeVis: meta.workingWithMeVis || "anyone",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleVisibilityChange = (name: string, value: string) => {
    setVisibility(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccess(false)

    try {
      const metadataToSave = {
        publicName: formData.publicName,
        pronouns: formData.pronouns,
        jobTitle: formData.jobTitle,
        department: formData.department,
        organization: formData.organization,
        basedIn: formData.basedIn,
        localTime: formData.localTime,
        contact: formData.contact,
        workingWithMe: formData.workingWithMe,
        ...visibility
      }

      await updateCurrentUser({
        name: formData.fullName,
        metadata: metadataToSave
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
  }

  return (
    <div className="flex-1 overflow-auto bg-background/50">
      <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-8">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Profile & Visibility</h2>
          <p className="text-muted-foreground">
            Manage your personal information and control who can see it across your workspaces.
          </p>
        </div>

        <form onSubmit={handleSave} className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {/* Avatar Section */}
          <div className="p-6 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-6">
              <Avatar className="size-20 border-2 border-background shadow-sm">
                <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {getInitials(currentUser?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Profile Picture</h3>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="outline" size="sm">Upload new</Button>
                  <Button type="button" variant="ghost" size="sm" className="text-destructive">Remove</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-1">
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <User className="mr-2 size-5 text-primary" /> Basic Information
            </h3>
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="fullName" 
              label="Full name" 
              placeholder="e.g. Jane Doe" 
              value={formData.fullName}
              visName="fullNameVis"
              visValue={visibility.fullNameVis}
            />
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="publicName" 
              label="Public name" 
              placeholder="e.g. Jane" 
              value={formData.publicName}
              visName="publicNameVis"
              visValue={visibility.publicNameVis}
            />
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="pronouns" 
              label="Pronouns" 
              placeholder="e.g. she/her" 
              value={formData.pronouns}
              visName="pronounsVis"
              visValue={visibility.pronounsVis}
            />
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="jobTitle" 
              label="Job title" 
              placeholder="e.g. Product Manager" 
              value={formData.jobTitle}
              visName="jobTitleVis"
              visValue={visibility.jobTitleVis}
            />
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="department" 
              label="Department" 
              placeholder="e.g. Engineering" 
              value={formData.department}
              visName="departmentVis"
              visValue={visibility.departmentVis}
            />
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="organization" 
              label="Organization" 
              placeholder="e.g. Acme Corp" 
              value={formData.organization}
              visName="organizationVis"
              visValue={visibility.organizationVis}
            />
          </div>
          
          <Separator />
          
          <div className="p-6 space-y-1">
            <h3 className="text-lg font-semibold mb-4">Location & Contact</h3>
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="basedIn" 
              label="Based in" 
              placeholder="e.g. San Francisco, CA" 
              value={formData.basedIn}
              visName="basedInVis"
              visValue={visibility.basedInVis}
            />
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="localTime" 
              label="Local time / Timezone" 
              placeholder="e.g. Pacific Time (PT)" 
              value={formData.localTime}
              visName="localTimeVis"
              visValue={visibility.localTimeVis}
            />
            
            <ProfileField 
              onChange={handleInputChange}
              onVisChange={handleVisibilityChange}
              id="contact" 
              label="Contact" 
              placeholder="e.g. Email or Phone number" 
              value={formData.contact}
              visName="contactVis"
              visValue={visibility.contactVis}
            />
          </div>

          <Separator />
          
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">About You</h3>
            
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="workingWithMe" className="text-sm font-medium">Working with you (User Manual)</Label>
                <VisibilitySelect name="workingWithMeVis" value={visibility.workingWithMeVis} onChange={handleVisibilityChange} />
              </div>
              <p className="text-sm text-muted-foreground">
                Share your communication preferences, working hours, and how you work best with others.
              </p>
              <Textarea 
                id="workingWithMe"
                name="workingWithMe"
                placeholder="I am most responsive in the mornings. I prefer asynchronous communication via tasks and comments..." 
                className="min-h-[150px] resize-y"
                value={formData.workingWithMe}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="p-6 bg-muted/20 border-t border-border flex items-center justify-end gap-3">
            {success && <span className="text-sm text-emerald-600 font-medium mr-2">Saved successfully!</span>}
            <Button type="button" variant="outline">Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
